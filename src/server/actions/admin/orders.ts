"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { orderItems, orders, type OrderStatus } from "@/db/schema";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import { recordAdminAction } from "@/server/services/admin-audit";
import { createNotification } from "@/server/services/notifications";

const DELIVER_ALLOWED: readonly OrderStatus[] = ["paid", "processing", "partial_delivered"];
const CANCEL_ALLOWED: readonly OrderStatus[] = ["pending", "processing"];
const REFUND_ALLOWED: readonly OrderStatus[] = ["paid", "processing", "partial_delivered", "delivered"];

function revalidateOrdersPages() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/dashboard/reviews");
}

async function findOrderMeta(orderId: string): Promise<{
  status: OrderStatus;
  userId: string;
  orderNumber: string;
} | null> {
  const [row] = await db
    .select({ status: orders.status, userId: orders.userId, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return row ?? null;
}

export async function markOrderDeliveredAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!orderId) return actionError("Order ID tidak valid.");

  const order = await findOrderMeta(orderId);
  if (!order) return actionError("Order tidak ditemukan.");
  if (!DELIVER_ALLOWED.includes(order.status)) {
    return actionError("Status order tidak valid untuk aksi deliver.");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "delivered",
        deliveredAt: now,
        updatedAt: now,
      })
      .where(and(eq(orders.id, orderId), inArray(orders.status, DELIVER_ALLOWED)));

    // Make each item explicitly delivered so review eligibility can rely on `order_items.delivered_at`.
    await tx
      .update(orderItems)
      .set({
        deliveredAt: now,
        updatedAt: now,
      })
      .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.deliveredAt)));
  });

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

  try {
    await createNotification({
      userId: order.userId,
      type: "order_delivered",
      title: "Order selesai dikirim",
      message: `Order ${order.orderNumber} sudah ditandai delivered.`,
      linkUrl: "/dashboard/orders",
    });
  } catch (error) {
    console.error("[markOrderDeliveredAction] notification failed", error);
  }

  revalidateOrdersPages();
  return actionOk(undefined);
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!orderId) return actionError("Order ID tidak valid.");

  const order = await findOrderMeta(orderId);
  if (!order) return actionError("Order tidak ditemukan.");
  if (!CANCEL_ALLOWED.includes(order.status)) {
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

  try {
    await createNotification({
      userId: order.userId,
      type: "order_cancelled",
      title: "Order dibatalkan",
      message: `Order ${order.orderNumber} dibatalkan oleh admin.`,
      linkUrl: "/dashboard/orders",
    });
  } catch (error) {
    console.error("[cancelOrderAction] notification failed", error);
  }

  revalidateOrdersPages();
  return actionOk(undefined);
}

export async function refundOrderAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!orderId) return actionError("Order ID tidak valid.");

  const order = await findOrderMeta(orderId);
  if (!order) return actionError("Order tidak ditemukan.");
  if (!REFUND_ALLOWED.includes(order.status)) {
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

  try {
    await createNotification({
      userId: order.userId,
      type: "order_refunded",
      title: "Refund diproses",
      message: `Order ${order.orderNumber} telah direfund.`,
      linkUrl: "/dashboard/orders",
    });
  } catch (error) {
    console.error("[refundOrderAction] notification failed", error);
  }

  revalidateOrdersPages();
  return actionOk(undefined);
}
