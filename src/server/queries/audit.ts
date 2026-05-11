import "server-only";

import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  credentialAccessLogs,
  orderItems,
  orders,
  users,
} from "@/db/schema";

export type ListCredentialAccessLogsInput = {
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type CredentialAccessLogRow = {
  id: string;
  action: string;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userEmail: string;
  orderNumber: string;
  productName: string;
  variantName: string;
};

export type ListCredentialAccessLogsResult = {
  items: CredentialAccessLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listCredentialAccessLogs(
  input: ListCredentialAccessLogsInput = {},
): Promise<ListCredentialAccessLogsResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;

  const conditions = [] as Array<ReturnType<typeof eq> | ReturnType<typeof gte>>;
  if (input.from) conditions.push(gte(credentialAccessLogs.createdAt, input.from));
  if (input.to) conditions.push(lte(credentialAccessLogs.createdAt, input.to));
  if (input.search?.trim()) {
    const q = `%${input.search.trim()}%`;
    const match = or(
      ilike(users.email, q),
      ilike(orders.orderNumber, q),
      ilike(credentialAccessLogs.action, q),
    );
    if (match) conditions.push(match);
  }

  const where = conditions.length === 0 ? undefined : and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: credentialAccessLogs.id,
        action: credentialAccessLogs.action,
        createdAt: credentialAccessLogs.createdAt,
        ipAddress: credentialAccessLogs.ipAddress,
        userAgent: credentialAccessLogs.userAgent,
        userEmail: users.email,
        orderNumber: orders.orderNumber,
        productSnapshot: orderItems.productSnapshot,
      })
      .from(credentialAccessLogs)
      .innerJoin(users, eq(users.id, credentialAccessLogs.userId))
      .innerJoin(orderItems, eq(orderItems.id, credentialAccessLogs.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(where)
      .orderBy(desc(credentialAccessLogs.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(credentialAccessLogs)
      .innerJoin(users, eq(users.id, credentialAccessLogs.userId))
      .innerJoin(orderItems, eq(orderItems.id, credentialAccessLogs.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(where ?? sql`true`),
  ]);

  const items: CredentialAccessLogRow[] = rows.map((row) => {
    const snapshot = row.productSnapshot as
      | { productName?: string; variantName?: string }
      | null;
    return {
      id: row.id,
      action: row.action,
      createdAt: row.createdAt,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      userEmail: row.userEmail,
      orderNumber: row.orderNumber,
      productName: snapshot?.productName ?? "Produk",
      variantName: snapshot?.variantName ?? "Varian",
    };
  });

  const total = Number(count ?? 0);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

