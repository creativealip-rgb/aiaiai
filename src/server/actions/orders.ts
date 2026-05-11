"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import {
  accountStocks,
  credentialAccessLogs,
  orderItems,
  orders,
} from "@/db/schema";
import { decryptCredential } from "@/lib/crypto";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireUser } from "@/server/auth";

export async function revealOrderItemCredentialAction(
  orderItemId: string,
): Promise<ActionResult<{ credential: string }>> {
  if (!orderItemId) return actionError("Item order tidak valid.");

  const user = await requireUser();
  const [row] = await db
    .select({
      orderItemId: orderItems.id,
      accountStockId: orderItems.accountStockId,
      deliveredAt: orderItems.deliveredAt,
      orderId: orders.id,
      orderStatus: orders.status,
      userId: orders.userId,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.id, orderItemId), eq(orders.userId, user.id)))
    .limit(1);

  if (!row) return actionError("Order item tidak ditemukan.");
  if (!row.accountStockId) return actionError("Item ini tidak memiliki kredensial.");
  if (!row.deliveredAt && row.orderStatus !== "delivered" && row.orderStatus !== "partial_delivered") {
    return actionError("Kredensial belum tersedia.");
  }

  const [stock] = await db
    .select({
      credentialCiphertext: accountStocks.credentialCiphertext,
      credentialIv: accountStocks.credentialIv,
      credentialTag: accountStocks.credentialTag,
    })
    .from(accountStocks)
    .where(eq(accountStocks.id, row.accountStockId))
    .limit(1);

  if (!stock) return actionError("Data kredensial tidak ditemukan.");

  const decrypted = decryptCredential({
    ciphertext: stock.credentialCiphertext,
    iv: stock.credentialIv,
    tag: stock.credentialTag,
  });

  const credential =
    typeof decrypted === "string"
      ? decrypted
      : JSON.stringify(decrypted, null, 2);

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get("x-forwarded-for") ?? reqHeaders.get("x-real-ip");
  const userAgent = reqHeaders.get("user-agent");

  await db.insert(credentialAccessLogs).values({
    userId: user.id,
    orderItemId: row.orderItemId,
    action: "view_credential",
    ipAddress: ipAddress ? ipAddress.slice(0, 255) : null,
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
  });

  return actionOk({ credential });
}

