"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { orders, type OrderStatus } from "@/db/schema";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import { recordAdminAction } from "@/server/services/admin-audit";

const DELIVER_ALLOWED: readonly OrderStatus[] = ["paid", "processing", "partial_delivered"];
const CANCEL_ALLOWED: readonly OrderStatus[] = ["pending", "processing"];
const REFUND_ALLOWED: readonly OrderStatus[] = ["paid", "processing", "partial_delivered", "delivered"];

function revalidateOrdersPages() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

async function findOrderStatus(orderId: string): Promise<OrderStatus | null> {
  const [row] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return row?.status ?? null;
}

export async function markOrderDeliveredAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!orderId) return actionError("Order ID tidak valid.");

  const current = await findOrderStatus(orderId);
  if (!current) return actionError("Order tidak ditemukan.");
  if (!DELIVER_ALLOWED.includes(current)) {
    return actionError("Status order tidak valid untuk aksi deliver.");
  }

  await db
    .update(orders)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, DELIVER_ALLOWED)));

  try {
    await recordAdminAction({
      actorId: admin.id,
      action: "order.mark_delivered",
      entityType: "order",
      entityId: orderId,
      diff: { toStatus: "delivered" },
    });
  } catch (error) {
    console.error("[markOrderDeliveredAction] audit log failed", error);
  }

  revalidateOrdersPages();
  return actionOk(undefined);
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!orderId) return actionError("Order ID tidak valid.");

  const current = await findOrderStatus(orderId);
  if (!current) return actionError("Order tidak ditemukan.");
  if (!CANCEL_ALLOWED.includes(current)) {
    return actionError("Status order tidak valid untuk aksi cancel.");
  }

  await db
    .update(orders)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, CANCEL_ALLOWED)));

  try {
    await recordAdminAction({
      actorId: admin.id,
      action: "order.cancel",
      entityType: "order",
      entityId: orderId,
      diff: { toStatus: "cancelled" },
    });
  } catch (error) {
    console.error("[cancelOrderAction] audit log failed", error);
  }

  revalidateOrdersPages();
  return actionOk(undefined);
}

export async function refundOrderAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!orderId) return actionError("Order ID tidak valid.");

  const current = await findOrderStatus(orderId);
  if (!current) return actionError("Order tidak ditemukan.");
  if (!REFUND_ALLOWED.includes(current)) {
    return actionError("Status order tidak valid untuk aksi refund.");
  }

  await db
    .update(orders)
    .set({
      status: "refunded",
      refundedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, REFUND_ALLOWED)));

  try {
    await recordAdminAction({
      actorId: admin.id,
      action: "order.refund",
      entityType: "order",
      entityId: orderId,
      diff: { toStatus: "refunded" },
    });
  } catch (error) {
    console.error("[refundOrderAction] audit log failed", error);
  }

  revalidateOrdersPages();
  return actionOk(undefined);
}
