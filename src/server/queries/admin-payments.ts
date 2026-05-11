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
import { orders, payments, users, type PaymentStatus } from "@/db/schema";

export type AdminPaymentsFilters = {
  status?: PaymentStatus | "all";
  gateway?: string | "all";
  q?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export type AdminPaymentRow = {
  id: string;
  gateway: string;
  gatewayRef: string | null;
  status: PaymentStatus;
  method: string | null;
  amount: string;
  fee: string;
  paidAt: Date | null;
  createdAt: Date;
  orderId: string;
  orderNumber: string;
  userEmail: string;
  userName: string;
};

export type PaymentsGatewaySummary = {
  gateway: string;
  paidCount: number;
  paidAmount: string;
  totalCount: number;
};

function buildConditions(filters: AdminPaymentsFilters): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(payments.status, filters.status));
  }
  if (filters.gateway && filters.gateway !== "all") {
    conditions.push(eq(payments.gateway, filters.gateway));
  }
  if (filters.from) {
    conditions.push(gte(payments.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(payments.createdAt, filters.to));
  }
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, q),
        ilike(users.email, q),
        ilike(payments.gatewayRef, q),
        ilike(payments.method, q),
      )!,
    );
  }

  return conditions;
}

export async function listAdminPayments(filters: AdminPaymentsFilters = {}): Promise<AdminPaymentRow[]> {
  const limit = Math.min(2000, Math.max(1, filters.limit ?? 200));
  const conditions = buildConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: payments.id,
      gateway: payments.gateway,
      gatewayRef: payments.gatewayRef,
      status: payments.status,
      method: payments.method,
      amount: payments.amount,
      fee: payments.fee,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      userEmail: users.email,
      userName: users.name,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(users, eq(users.id, payments.userId))
    .where(where)
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export async function listPaymentGateways(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ gateway: payments.gateway })
    .from(payments)
    .orderBy(payments.gateway);

  return rows.map((row) => row.gateway).filter(Boolean);
}

export async function summarizePaymentsByGateway(
  filters: AdminPaymentsFilters = {},
): Promise<PaymentsGatewaySummary[]> {
  const conditions = buildConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      gateway: payments.gateway,
      totalCount: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
      paidAmount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(users, eq(users.id, payments.userId))
    .where(where)
    .groupBy(payments.gateway)
    .orderBy(payments.gateway);
}

export async function summarizePaymentsTotals(filters: AdminPaymentsFilters = {}): Promise<{
  totalCount: number;
  paidCount: number;
  paidAmount: string;
}> {
  const conditions = buildConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [row] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
      paidAmount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(users, eq(users.id, payments.userId))
    .where(where);

  return {
    totalCount: Number(row?.totalCount ?? 0),
    paidCount: Number(row?.paidCount ?? 0),
    paidAmount: row?.paidAmount ?? "0",
  };
}

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
];

export function normalizePaymentStatus(value?: string): PaymentStatus | "all" {
  if (!value) return "all";
  if (PAYMENT_STATUSES.includes(value as PaymentStatus)) return value as PaymentStatus;
  return "all";
}
