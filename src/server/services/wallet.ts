import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { users, walletTopups, walletTransactions } from "@/db/schema";
import { env } from "@/lib/env";
import { createMayarInvoice } from "@/lib/payment/mayar";
import { createNotification } from "@/server/services/notifications";

export class WalletError extends Error {
  readonly code: string;
  constructor(message: string, code = "WALLET_ERROR") {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}

export async function createWalletTopup(userId: string, amount: number): Promise<{ paymentUrl: string }> {
  if (!Number.isFinite(amount) || amount < 10_000) {
    throw new WalletError("Minimum top up adalah Rp10.000.", "TOPUP_MIN");
  }
  if (amount > 50_000_000) {
    throw new WalletError("Maksimum top up per transaksi adalah Rp50.000.000.", "TOPUP_MAX");
  }

  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new WalletError("User tidak ditemukan.", "USER_NOT_FOUND");

  const [topup] = await db
    .insert(walletTopups)
    .values({
      userId,
      amount: amount.toString(),
      status: "pending",
    })
    .returning();

  if (!topup) throw new WalletError("Gagal membuat top up.");

  const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/wallet`;
  const invoice = await createMayarInvoice({
    orderNumber: `TOPUP-${topup.id}`,
    amount,
    customerName: user.name || "Member",
    customerEmail: user.email,
    description: `Top up saldo AI3 (${topup.id})`,
    items: [{ name: "Top up saldo AI3", qty: 1, price: amount }],
    redirectUrl,
  });

  await db
    .update(walletTopups)
    .set({
      mayarInvoiceId: invoice.invoiceId,
      paymentUrl: invoice.paymentUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(walletTopups.id, topup.id));

  return { paymentUrl: invoice.paymentUrl };
}

export async function processWalletTopupSuccess(mayarInvoiceId: string): Promise<boolean> {
  const [topup] = await db
    .select()
    .from(walletTopups)
    .where(eq(walletTopups.mayarInvoiceId, mayarInvoiceId))
    .limit(1);

  if (!topup) return false;
  if (topup.status === "paid") return true;

  const amount = Number(topup.amount);
  const now = new Date();

  await db.transaction(async (tx) => {
    const [updatedTopup] = await tx
      .update(walletTopups)
      .set({
        status: "paid",
        paidAt: now,
        updatedAt: now,
      })
      .where(and(eq(walletTopups.id, topup.id), eq(walletTopups.status, "pending")))
      .returning({ id: walletTopups.id });

    if (!updatedTopup) return;

    const [updatedUser] = await tx
      .update(users)
      .set({
        balance: sql`${users.balance} + ${amount.toString()}`,
        updatedAt: now,
      })
      .where(eq(users.id, topup.userId))
      .returning({ balance: users.balance });

    await tx.insert(walletTransactions).values({
      userId: topup.userId,
      type: "topup",
      amount: amount.toString(),
      balanceAfter: Number(updatedUser?.balance ?? 0).toString(),
      refType: "wallet_topup",
      refId: topup.id,
      description: "Top up saldo via Mayar",
    });
  });

  await createNotification({
    userId: topup.userId,
    type: "wallet_topup_paid",
    title: "Top up berhasil",
    message: `Saldo Anda bertambah Rp${Number(topup.amount).toLocaleString("id-ID")}.`,
    linkUrl: "/dashboard/wallet",
  });

  return true;
}

export async function listWalletTopupsByUser(userId: string) {
  return db
    .select()
    .from(walletTopups)
    .where(eq(walletTopups.userId, userId))
    .orderBy(desc(walletTopups.createdAt))
    .limit(50);
}

export async function listWalletTransactionsByUser(userId: string) {
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(100);
}

