import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";

export type MemberOrderListRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: string | null;
  paidAt: Date | null;
  createdAt: Date;
  itemCount: number;
};

export async function listOrdersByUser(userId: string): Promise<MemberOrderListRow[]> {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
      itemCount: sql<number>`(
        select count(*)::int
        from ${orderItems}
        where ${orderItems.orderId} = ${orders.id}
      )`,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export type MemberOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  total: string | null;
  createdAt: Date;
  paidAt: Date | null;
  deliveredAt: Date | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    qty: number;
    lineTotal: string | null;
    deliveredAt: Date | null;
    hasCredential: boolean;
  }>;
};

export async function getOrderDetailForUser(
  orderId: string,
  userId: string,
): Promise<MemberOrderDetail | null> {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      deliveredAt: orders.deliveredAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      qty: orderItems.qty,
      lineTotal: orderItems.lineTotal,
      deliveredAt: orderItems.deliveredAt,
      accountStockId: orderItems.accountStockId,
      productSnapshot: orderItems.productSnapshot,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(desc(orderItems.createdAt));

  return {
    ...order,
    items: items.map((item) => {
      const snapshot = item.productSnapshot as
        | { productName?: string; variantName?: string }
        | null;
      return {
        id: item.id,
        productName: snapshot?.productName ?? "Produk",
        variantName: snapshot?.variantName ?? "Varian",
        qty: item.qty,
        lineTotal: item.lineTotal,
        deliveredAt: item.deliveredAt,
        hasCredential: !!item.accountStockId,
      };
    }),
  };
}

