import "server-only";

import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { orders, users, type UserRole } from "@/db/schema";

export type AdminUsersFilters = {
  q?: string;
  role?: UserRole | "all";
  banned?: "all" | "banned" | "active";
  limit?: number;
};

export type AdminUserListRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isBanned: boolean;
  balance: string;
  createdAt: Date;
  claimedAt: Date | null;
  emailVerified: boolean;
  orderCount: number;
  lastOrderAt: Date | null;
};

export async function listAdminUsers(filters: AdminUsersFilters = {}): Promise<AdminUserListRow[]> {
  const conditions: SQL<unknown>[] = [isNull(users.deletedAt)];

  if (filters.role && filters.role !== "all") {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.banned === "banned") {
    conditions.push(eq(users.isBanned, true));
  } else if (filters.banned === "active") {
    conditions.push(eq(users.isBanned, false));
  }

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(users.email, q), ilike(users.name, q), ilike(users.phone, q))!);
  }

  const where = and(...conditions);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 100));

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isBanned: users.isBanned,
      balance: users.balance,
      createdAt: users.createdAt,
      claimedAt: users.claimedAt,
      emailVerified: users.emailVerified,
      orderCount: sql<number>`(
        select count(*)::int
        from ${orders}
        where ${orders.userId} = ${users.id}
      )`,
      lastOrderAt: sql<Date | null>`(
        select max(${orders.createdAt})
        from ${orders}
        where ${orders.userId} = ${users.id}
      )`,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isBanned: boolean;
  balance: string;
  emailVerified: boolean;
  claimedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  orderCount: number;
  paidOrderCount: number;
};

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isBanned: users.isBanned,
      balance: users.balance,
      emailVerified: users.emailVerified,
      claimedAt: users.claimedAt,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      orderCount: sql<number>`(
        select count(*)::int
        from ${orders}
        where ${orders.userId} = ${users.id}
      )`,
      paidOrderCount: sql<number>`(
        select count(*)::int
        from ${orders}
        where ${orders.userId} = ${users.id}
          and ${orders.status} in ('paid', 'processing', 'partial_delivered', 'delivered')
      )`,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return row ?? null;
}

export type AdminUserOrderHistoryRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

export async function listOrdersByUserForAdmin(userId: string): Promise<AdminUserOrderHistoryRow[]> {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(25);
}

