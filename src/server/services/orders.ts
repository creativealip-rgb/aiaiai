import "server-only";

/**
 * Order service — creates orders from checkout, generates order numbers,
 * handles payment initiation, and processes webhook callbacks.
 *
 * IMPLEMENTATION_PLAN.md §7.1, §7.2, §7.8
 */

import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accountStocks,
  orderAccessTokens,
  orderItems,
  orders,
  payments,
  productVariants,
  products,
  users,
  type Order,
} from "@/db/schema";
import { decryptCredential } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendOrderDeliveryEmail } from "@/lib/email/order-delivery";
import { sendGuestOrderAccessEmail } from "@/lib/email/order-access";
import { createMayarInvoice } from "@/lib/payment/mayar";
import type { CheckoutInput } from "@/lib/schemas/checkout";
import { findOrCreateShadowUser, ShadowUserAlreadyClaimedError } from "@/server/auth";

// ---------------------------------------------------------------------------
// Order number generation: AI3-YYYY-NNNN (sequential per year)
// ---------------------------------------------------------------------------

async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AI3-${year}-`;
  const [row] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(sql`${orders.orderNumber} like ${prefix + "%"}`)
    .orderBy(sql`${orders.orderNumber} desc`)
    .limit(1);

  let seq = 1;
  if (row?.orderNumber) {
    const last = row.orderNumber.split("-").pop();
    seq = (parseInt(last ?? "0", 10) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Create order
// ---------------------------------------------------------------------------

export type CreateOrderResult = {
  order: Order;
  paymentUrl: string | null;
};

/**
 * Create an order from checkout input.
 *
 * @param input  Validated checkout payload.
 * @param userId If the user is logged in, their id. Null for guest.
 */
export async function createOrder(
  input: CheckoutInput,
  userId: string | null,
): Promise<CreateOrderResult> {
  // 1. Resolve user (logged-in or shadow)
  let resolvedUserId: string;
  let isGuestOrder = false;

  if (userId) {
    resolvedUserId = userId;
  } else {
    if (!input.guestEmail) {
      throw new CheckoutError("Email wajib diisi untuk checkout tanpa login.");
    }
    try {
      const shadow = await findOrCreateShadowUser({
        email: input.guestEmail,
        name: input.guestName || undefined,
        phone: input.guestPhone || undefined,
      });
      resolvedUserId = shadow.id;
      isGuestOrder = true;
    } catch (error) {
      if (error instanceof ShadowUserAlreadyClaimedError) {
        throw new CheckoutError(
          "Email ini sudah terdaftar. Silakan login terlebih dahulu.",
          "EMAIL_CLAIMED",
        );
      }
      throw error;
    }
  }

  // 2. Validate items exist & compute prices
  const lineItems: {
    productId: string;
    variantId: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    snapshot: Record<string, unknown>;
  }[] = [];

  for (const item of input.items) {
    const [variant] = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        sku: productVariants.sku,
        price: productVariants.price,
        isActive: productVariants.isActive,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, item.variantId),
          eq(productVariants.productId, item.productId),
        ),
      )
      .limit(1);

    if (!variant || !variant.isActive) {
      throw new CheckoutError(`Varian tidak tersedia atau sudah nonaktif.`, "VARIANT_UNAVAILABLE");
    }

    const [product] = await db
      .select({ id: products.id, name: products.name, slug: products.slug, isActive: products.isActive })
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!product || !product.isActive) {
      throw new CheckoutError(`Produk tidak tersedia.`, "PRODUCT_UNAVAILABLE");
    }

    const unitPrice = Number(variant.price);
    lineItems.push({
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
      snapshot: {
        productName: product.name,
        productSlug: product.slug,
        variantName: variant.name,
        variantSku: variant.sku,
        unitPrice,
      },
    });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
  const total = subtotal; // Voucher discount deferred to Fase 6

  // 3. Create order + items in a transaction
  const orderNumber = await nextOrderNumber();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const wantsWallet =
    !!userId && (input.useBalance || input.paymentMethod === "wallet");
  const now = new Date();

  const { order, paidWithWallet } = await db.transaction(async (tx) => {
    let walletUsed = 0;
    let resolvedPaymentMethod: "mayar" | "wallet" = "mayar";
    let initialOrderStatus: "pending" | "paid" = "pending";
    let paidAt: Date | null = null;
    let orderExpiresAt: Date | null = expiresAt;

    if (wantsWallet) {
      const [userBalance] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, resolvedUserId))
        .limit(1);

      const balance = Number(userBalance?.balance ?? "0");
      if (!Number.isFinite(balance) || balance < total) {
        throw new CheckoutError(
          "Saldo tidak cukup untuk pembayaran penuh. Pilih Mayar atau top up saldo.",
          "INSUFFICIENT_WALLET_BALANCE",
        );
      }

      walletUsed = total;
      resolvedPaymentMethod = "wallet";
      initialOrderStatus = "paid";
      paidAt = now;
      orderExpiresAt = null;

      const debited = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} - ${walletUsed.toString()}`,
          updatedAt: now,
        })
        .where(and(eq(users.id, resolvedUserId), sql`${users.balance} >= ${walletUsed.toString()}`))
        .returning({ id: users.id });

      if (debited.length === 0) {
        throw new CheckoutError(
          "Saldo berubah saat checkout. Muat ulang halaman lalu coba lagi.",
          "BALANCE_CHANGED",
        );
      }
    }

    const [ord] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: resolvedUserId,
        isGuestOrder,
        status: initialOrderStatus,
        subtotal: subtotal.toString(),
        discount: "0",
        total: total.toString(),
        paymentMethod: resolvedPaymentMethod,
        walletUsed: walletUsed.toString(),
        notes: input.notes || null,
        expiresAt: orderExpiresAt,
        paidAt,
      })
      .returning();
    if (!ord) throw new Error("Failed to insert order");

    await tx.insert(orderItems).values(
      lineItems.map((li) => ({
        orderId: ord.id,
        productId: li.productId,
        variantId: li.variantId,
        qty: li.qty,
        unitPrice: li.unitPrice.toString(),
        lineTotal: li.lineTotal.toString(),
        productSnapshot: li.snapshot,
      })),
    );

    if (walletUsed > 0) {
      await tx.insert(payments).values({
        orderId: ord.id,
        userId: resolvedUserId,
        gateway: "wallet",
        gatewayRef: `wallet-${ord.id}`,
        amount: walletUsed.toString(),
        status: "paid",
        method: "wallet_balance",
        paidAt: now,
        rawRequest: { orderNumber: ord.orderNumber, amount: walletUsed },
        rawResponse: { source: "wallet_balance" },
      });
    }

    return { order: ord, paidWithWallet: walletUsed > 0 };
  });

  // 4. Create Mayar invoice
  let paymentUrl: string | null = null;
  if (!paidWithWallet) {
    try {
      const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/order/${order.orderNumber}`;
      const result = await createMayarInvoice({
        orderNumber: order.orderNumber,
        amount: total,
        customerName: input.guestName || "Member",
        customerEmail: input.guestEmail || "noreply@ai3.local",
        description: `Order ${order.orderNumber}`,
        items: lineItems.map((li) => ({
          name: `${(li.snapshot as { productName: string }).productName} — ${(li.snapshot as { variantName: string }).variantName}`,
          qty: li.qty,
          price: li.unitPrice,
        })),
        redirectUrl,
      });

      paymentUrl = result.paymentUrl;

      // Record payment row
      await db.insert(payments).values({
        orderId: order.id,
        userId: resolvedUserId,
        gateway: "mayar",
        gatewayRef: result.invoiceId,
        amount: total.toString(),
        status: "pending",
        rawRequest: { orderNumber: order.orderNumber, amount: total },
        rawResponse: result.rawResponse as Record<string, unknown>,
      });
    } catch (error) {
      // If Mayar fails, order stays pending — user can retry or it expires.
      console.error("[createOrder] Mayar invoice failed:", error);
    }
  }

  // Wallet-only orders are paid immediately and skip webhook. Issue guest
  // access link right away when this edge-case ever happens in the future.
  if (isGuestOrder && paidWithWallet) {
    await issueGuestAccessLink(order.id, order.orderNumber, resolvedUserId);
  }

  if (paidWithWallet) {
    try {
      await autoAssignAccountStocksAfterPayment(order.id);
      await sendDeliveryEmailForOrder(order.id);
    } catch (error) {
      console.error("[createOrder] wallet auto-assign failed", error);
      await db
        .update(orders)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    }
  }

  return { order, paymentUrl };
}

// ---------------------------------------------------------------------------
// Process webhook payment success
// ---------------------------------------------------------------------------

export async function processPaymentSuccess(
  gatewayRef: string,
  _transactionId: string,
  paymentMethod?: string,
): Promise<void> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.gatewayRef, gatewayRef))
    .limit(1);

  if (!payment) {
    console.warn(`[processPaymentSuccess] No payment found for ref: ${gatewayRef}`);
    return;
  }
  if (payment.status === "paid") return; // idempotent

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({
        status: "paid",
        method: paymentMethod ?? null,
        paidAt: now,
        webhookReceivedAt: now,
        updatedAt: now,
      })
      .where(eq(payments.id, payment.id));

    await tx
      .update(orders)
      .set({
        status: "paid",
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, payment.orderId));
  });

  const [paidOrder] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      isGuestOrder: orders.isGuestOrder,
      userId: orders.userId,
    })
    .from(orders)
    .where(eq(orders.id, payment.orderId))
    .limit(1);

  if (paidOrder?.isGuestOrder) {
    await issueGuestAccessLink(paidOrder.id, paidOrder.orderNumber, paidOrder.userId);
  }

  try {
    await autoAssignAccountStocksAfterPayment(payment.orderId);
    await sendDeliveryEmailForOrder(payment.orderId);
  } catch (error) {
    console.error("[processPaymentSuccess] auto stock assignment failed", error);
    await db
      .update(orders)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(orders.id, payment.orderId));
  }
}

// ---------------------------------------------------------------------------
// Expire pending orders (called by cron/route handler)
// ---------------------------------------------------------------------------

export async function expirePendingOrders(): Promise<number> {
  const now = new Date();
  const expired = await db
    .update(orders)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(orders.status, "pending"),
        sql`${orders.expiresAt} < ${now.toISOString()}`,
      ),
    )
    .returning({ id: orders.id });
  return expired.length;
}

// ---------------------------------------------------------------------------
// Guest access token helpers
// ---------------------------------------------------------------------------

async function issueGuestAccessLink(
  orderId: string,
  orderNumber: string,
  userId: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: orderAccessTokens.id })
    .from(orderAccessTokens)
    .where(eq(orderAccessTokens.orderId, orderId))
    .limit(1);
  if (existing) return;

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.email) return;

  const tokenRaw = randomBytes(32).toString("hex");
  await upsertGuestOrderAccessToken(orderId, tokenRaw);

  try {
    await sendGuestOrderAccessEmail({
      to: user.email,
      orderNumber,
      token: tokenRaw,
    });
  } catch (error) {
    console.error("[issueGuestAccessLink] failed to send email", error);
  }
}

export async function verifyAndTouchOrderAccessToken(
  orderId: string,
  tokenRaw: string,
): Promise<boolean> {
  const tokenHash = createHash("sha256").update(tokenRaw).digest("hex");
  const [token] = await db
    .select({ id: orderAccessTokens.id })
    .from(orderAccessTokens)
    .where(
      and(
        eq(orderAccessTokens.orderId, orderId),
        eq(orderAccessTokens.tokenHash, tokenHash),
        sql`${orderAccessTokens.expiresAt} > now()`,
      ),
    )
    .limit(1);

  if (!token) return false;

  await db
    .update(orderAccessTokens)
    .set({
      usedCount: sql`${orderAccessTokens.usedCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(orderAccessTokens.id, token.id));

  return true;
}

async function upsertGuestOrderAccessToken(
  orderId: string,
  tokenRaw: string,
): Promise<void> {
  const tokenHash = createHash("sha256").update(tokenRaw).digest("hex");

  await db.delete(orderAccessTokens).where(eq(orderAccessTokens.orderId, orderId));
  await db.insert(orderAccessTokens).values({
    orderId,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

export async function resendGuestOrderAccessLink(
  orderNumber: string,
  email: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const [row] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      isGuestOrder: orders.isGuestOrder,
      status: orders.status,
      claimedAt: users.claimedAt,
      userEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!row) return false;
  if (!row.isGuestOrder) return false;
  if (row.claimedAt) return false;
  if (row.userEmail.toLowerCase() !== normalizedEmail) return false;
  const paidStatuses: Order["status"][] = [
    "paid",
    "processing",
    "partial_delivered",
    "delivered",
  ];
  if (!paidStatuses.includes(row.status)) return false;

  const tokenRaw = randomBytes(32).toString("hex");
  await upsertGuestOrderAccessToken(row.id, tokenRaw);

  try {
    await sendGuestOrderAccessEmail({
      to: row.userEmail,
      orderNumber: row.orderNumber,
      token: tokenRaw,
    });
    return true;
  } catch (error) {
    console.error("[resendGuestOrderAccessLink] failed to send email", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auto stock assignment (Phase 4)
// ---------------------------------------------------------------------------

type CheckoutOrderItem = {
  orderItemId: string;
  variantId: string;
  qty: number;
  stockMode: "tracked" | "unlimited";
  productType: "account" | "service";
  deliveryType: "auto" | "manual";
};

async function autoAssignAccountStocksAfterPayment(orderId: string): Promise<void> {
  const rows = await db
    .select({
      orderItemId: orderItems.id,
      variantId: orderItems.variantId,
      qty: orderItems.qty,
      stockMode: productVariants.stockMode,
      productType: products.type,
      deliveryType: products.deliveryType,
    })
    .from(orderItems)
    .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, orderId));

  const items = rows as CheckoutOrderItem[];

  const trackedAutoAccountItems = items.filter(
    (item) =>
      item.productType === "account" &&
      item.deliveryType === "auto" &&
      item.stockMode === "tracked",
  );

  const hasManualWork = items.some(
    (item) =>
      item.productType === "service" ||
      item.deliveryType === "manual" ||
      item.stockMode === "unlimited",
  );

  if (trackedAutoAccountItems.length === 0) {
    await db
      .update(orders)
      .set({
        status: hasManualWork ? "processing" : "delivered",
        deliveredAt: hasManualWork ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const item of trackedAutoAccountItems) {
      const locked = await tx.execute(sql<{ id: string }>`
        select id
        from ${accountStocks}
        where ${accountStocks.variantId} = ${item.variantId}
          and ${accountStocks.status} = 'available'
        order by ${accountStocks.createdAt} asc
        limit ${item.qty}
        for update skip locked
      `);

      const ids = locked.map((row) => row.id as string);
      if (ids.length < item.qty) {
        throw new CheckoutError(
          `Stok tidak cukup untuk varian ${item.variantId}.`,
          "STOCK_NOT_ENOUGH",
        );
      }

      await tx
        .update(accountStocks)
        .set({
          status: "sold",
          soldToOrderItemId: item.orderItemId,
          reservedUntil: null,
          updatedAt: now,
        })
        .where(inArray(accountStocks.id, ids));

      await tx
        .update(orderItems)
        .set({
          accountStockId: ids[0] ?? null,
          deliveredAt: now,
          deliveryNotes:
            ids.length > 1 ? `Assigned stock ids: ${ids.join(",")}` : null,
          updatedAt: now,
        })
        .where(eq(orderItems.id, item.orderItemId));
    }

    await tx
      .update(orders)
      .set({
        status: hasManualWork ? "partial_delivered" : "delivered",
        deliveredAt: hasManualWork ? null : now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));
  });
}

async function sendDeliveryEmailForOrder(orderId: string): Promise<void> {
  const [orderRow] = await db
    .select({
      orderNumber: orders.orderNumber,
      userEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!orderRow?.userEmail) return;

  const rows = await db
    .select({
      deliveredAt: orderItems.deliveredAt,
      productSnapshot: orderItems.productSnapshot,
      credentialCiphertext: accountStocks.credentialCiphertext,
      credentialIv: accountStocks.credentialIv,
      credentialTag: accountStocks.credentialTag,
    })
    .from(orderItems)
    .innerJoin(accountStocks, eq(accountStocks.id, orderItems.accountStockId))
    .where(eq(orderItems.orderId, orderId));

  if (rows.length === 0) return;

  const emailItems = rows
    .filter((row) => !!row.deliveredAt)
    .map((row) => {
      const snapshot = row.productSnapshot as
        | { productName?: string; variantName?: string }
        | null;
      const decrypted = decryptCredential({
        ciphertext: row.credentialCiphertext,
        iv: row.credentialIv,
        tag: row.credentialTag,
      });

      return {
        productName: snapshot?.productName ?? "Produk",
        variantName: snapshot?.variantName ?? "Varian",
        credential:
          typeof decrypted === "string"
            ? decrypted
            : JSON.stringify(decrypted, null, 2),
      };
    });

  if (emailItems.length === 0) return;

  await sendOrderDeliveryEmail({
    to: orderRow.userEmail,
    orderNumber: orderRow.orderNumber,
    items: emailItems,
  });
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CheckoutError extends Error {
  readonly code: string;
  constructor(message: string, code = "CHECKOUT_ERROR") {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
  }
}
