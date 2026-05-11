import "server-only";

import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, users, type OrderStatus } from "@/db/schema";

export type AdminOrderFilters = {
  status?: OrderStatus | "all";
  q?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export type AdminOrderListRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string | null;
  paymentMethod: string | null;
  walletUsed: string;
  createdAt: Date;
  paidAt: Date | null;
  deliveredAt: Date | null;
  userId: string;
  userEmail: string;
  userName: string;
  itemCount: number;
};

export async function listAdminOrders(filters: AdminOrderFilters = {}): Promise<AdminOrderListRow[]> {
  const conditions: SQL<unknown>[] = [];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(orders.status, filters.status));
  }

  if (filters.from) {
    conditions.push(gte(orders.createdAt, filters.from));
  }

  if (filters.to) {
    conditions.push(lte(orders.createdAt, filters.to));
  }

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(ilike(orders.orderNumber, q), ilike(users.email, q), ilike(users.name, q))!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(200, Math.max(1, filters.limit ?? 100));

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      walletUsed: orders.walletUsed,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      deliveredAt: orders.deliveredAt,
      userId: users.id,
      userEmail: users.email,
      userName: users.name,
      itemCount: sql<number>`(
        select count(*)::int
        from ${orderItems}
        where ${orderItems.orderId} = ${orders.id}
      )`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

