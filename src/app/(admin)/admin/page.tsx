import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import {
  accountStocks,
  categories,
  orderItems,
  orders,
  products,
  productVariants,
  type OrderStatus,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { formatIdr } from "@/lib/price";

import { DashboardCharts } from "./dashboard-charts";

export const metadata: Metadata = {
  title: "Admin · Dashboard",
};

export const dynamic = "force-dynamic";

const REVENUE_STATUSES: readonly OrderStatus[] = [
  "paid",
  "processing",
  "partial_delivered",
  "delivered",
];

const STATUS_ORDER = [
  "pending",
  "paid",
  "processing",
  "partial_delivered",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  partial_delivered: "Partial",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
};

type TopProduct = {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: string | null;
};

type LowStockItem = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  available: number;
};

export default async function AdminDashboardPage() {
  const now = new Date();
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [counts, revenueDay, revenueWeek, revenueMonth, statusRows, topProducts, lowStock] =
    await Promise.all([
      getCounts(),
      sumRevenueSince(dayStart),
      sumRevenueSince(weekStart),
      sumRevenueSince(monthStart),
      getOrderStatusCounts(),
      getTopProducts(),
      getLowStockAlerts(),
    ]);

  const statusMap = new Map(statusRows.map((row) => [row.status, row.total]));
  const orderStatusData = STATUS_ORDER.map((status) => ({
    status: STATUS_LABELS[status] ?? status,
    total: Number(statusMap.get(status) ?? 0),
  }));

  const revenueData = [
    { label: "24 jam", value: revenueDay },
    { label: "7 hari", value: revenueWeek },
    { label: "30 hari", value: revenueMonth },
  ];

  const pendingOrders = Number(statusMap.get("pending") ?? 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Revenue, performa order, produk terlaris, dan peringatan stok menipis.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Revenue 24 jam" value={formatIdr(revenueDay)} hint="Gross paid orders" />
        <StatCard title="Revenue 7 hari" value={formatIdr(revenueWeek)} hint="Gross paid orders" />
        <StatCard title="Revenue 30 hari" value={formatIdr(revenueMonth)} hint="Gross paid orders" />
        <StatCard title="Order pending" value={pendingOrders.toLocaleString("id-ID")} hint="Perlu follow up" />
        <StatCard title="Produk aktif" value={counts.activeProducts.toLocaleString("id-ID")} hint="Terlihat di katalog" />
        <StatCard title="Low stock alert" value={lowStock.length.toLocaleString("id-ID")} hint="Varian tracked <= 5" />
      </div>

      <DashboardCharts revenueData={revenueData} orderStatusData={orderStatusData} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Berdasarkan revenue order paid/delivered.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada penjualan.</p>
            ) : (
              <ul className="divide-y">
                {topProducts.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {item.qtySold.toLocaleString("id-ID")} item terjual
                      </p>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      {formatIdr(item.revenue ?? "0")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock variants</CardTitle>
            <CardDescription>Varian tracked dengan stok available 5 atau kurang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada low stock saat ini.</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.map((item) => (
                  <li
                    key={item.variantId}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.productName}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.variantName} · {item.sku}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.available === 0 ? "destructive" : "outline"}>
                        {item.available} stok
                      </Badge>
                      <Link href="/admin/stocks" className="text-xs underline">
                        Kelola
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniInfo title="Varian total" value={counts.variants.toLocaleString("id-ID")} />
        <MiniInfo title="Kategori aktif" value={counts.activeCategories.toLocaleString("id-ID")} />
        <MiniInfo title="Produk nonaktif" value={counts.inactiveProducts.toLocaleString("id-ID")} />
      </div>
    </div>
  );
}

async function getCounts() {
  const [[{ activeProducts }], [{ inactiveProducts }], [{ variants }], [{ activeCategories }]] =
    await Promise.all([
      db
        .select({ activeProducts: sql<number>`count(*)::int` })
        .from(products)
        .where(and(eq(products.isActive, true), isNull(products.deletedAt))),
      db
        .select({ inactiveProducts: sql<number>`count(*)::int` })
        .from(products)
        .where(and(eq(products.isActive, false), isNull(products.deletedAt))),
      db.select({ variants: sql<number>`count(*)::int` }).from(productVariants),
      db
        .select({ activeCategories: sql<number>`count(*)::int` })
        .from(categories)
        .where(eq(categories.isActive, true)),
    ]);

  return {
    activeProducts: Number(activeProducts ?? 0),
    inactiveProducts: Number(inactiveProducts ?? 0),
    variants: Number(variants ?? 0),
    activeCategories: Number(activeCategories ?? 0),
  };
}

async function sumRevenueSince(since: Date): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, REVENUE_STATUSES),
        sql`${orders.paidAt} >= ${since.toISOString()}`,
      ),
    );

  return Number(row?.total ?? 0);
}

async function getOrderStatusCounts(): Promise<Array<{ status: string; total: number }>> {
  const rows = await db
    .select({
      status: orders.status,
      total: sql<number>`count(*)::int`,
    })
    .from(orders)
    .groupBy(orders.status);

  return rows.map((row) => ({
    status: row.status,
    total: Number(row.total ?? 0),
  }));
}

async function getTopProducts(): Promise<TopProduct[]> {
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      qtySold: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int`,
      revenue: sql<string>`coalesce(sum(${orderItems.lineTotal}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(inArray(orders.status, REVENUE_STATUSES))
    .groupBy(products.id, products.name)
    .orderBy(desc(sql`coalesce(sum(${orderItems.lineTotal}), 0)`))
    .limit(5);

  return rows;
}

async function getLowStockAlerts(): Promise<LowStockItem[]> {
  const rows = await db
    .select({
      productId: products.id,
      variantId: productVariants.id,
      productName: products.name,
      variantName: productVariants.name,
      sku: productVariants.sku,
      available: sql<number>`coalesce(count(${accountStocks.id}), 0)::int`,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(
      accountStocks,
      and(
        eq(accountStocks.variantId, productVariants.id),
        eq(accountStocks.status, "available"),
      ),
    )
    .where(
      and(
        eq(productVariants.stockMode, "tracked"),
        eq(productVariants.isActive, true),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    )
    .groupBy(products.id, productVariants.id, products.name, productVariants.name, productVariants.sku)
    .having(sql`coalesce(count(${accountStocks.id}), 0) <= 5`)
    .orderBy(asc(sql`coalesce(count(${accountStocks.id}), 0)`), asc(products.name))
    .limit(8);

  return rows.map((row) => ({
    ...row,
    available: Number(row.available ?? 0),
  }));
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
