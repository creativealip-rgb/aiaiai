import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatIdr } from "@/lib/price";
import { listAdminOrders } from "@/server/queries/admin-orders";
import type { OrderStatus } from "@/db/schema";

import { OrderRowActions } from "./order-row-actions";

export const metadata: Metadata = {
  title: "Admin · Orders",
};

export const dynamic = "force-dynamic";

const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "partial_delivered",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  partial_delivered: "Partial",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const status = ORDER_STATUSES.includes((params.status ?? "") as OrderStatus)
    ? ((params.status ?? "all") as OrderStatus)
    : "all";
  const q = params.q?.trim() ?? "";
  const from = parseDateParam(params.from);
  const to = parseDateParam(params.to, true);

  const rows = await listAdminOrders({
    status: status === "all" ? "all" : status,
    q: q || undefined,
    from: from ?? undefined,
    to: to ?? undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Filter status/tanggal/search dan lakukan aksi deliver, cancel, refund.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="q">
                Search
              </label>
              <Input
                id="q"
                name="q"
                placeholder="Order number / email / nama"
                defaultValue={q}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="all">Semua</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="from">
                Dari tanggal
              </label>
              <Input id="from" name="from" type="date" defaultValue={params.from ?? ""} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="to">
                Sampai tanggal
              </label>
              <Input id="to" name="to" type="date" defaultValue={params.to ?? ""} />
            </div>
            <div className="md:col-span-4">
              <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                Terapkan filter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar order ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada order untuk filter ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Pelanggan</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Total</th>
                    <th className="py-2 pr-3 font-medium">Metode</th>
                    <th className="py-2 pr-3 font-medium">Dibuat</th>
                    <th className="py-2 pr-0 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium">{row.orderNumber}</div>
                        <div className="text-muted-foreground text-xs">{row.itemCount} item</div>
                        <Link
                          href={`/order/${row.orderNumber}`}
                          className="text-xs underline"
                          target="_blank"
                        >
                          Lihat halaman order
                        </Link>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium">{row.userName || "-"}</div>
                        <div className="text-muted-foreground text-xs">{row.userEmail}</div>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums">
                        {formatIdr(row.total ?? "0")}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div>{row.paymentMethod ?? "-"}</div>
                        {Number(row.walletUsed) > 0 ? (
                          <div className="text-muted-foreground text-xs">
                            wallet: {formatIdr(row.walletUsed)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 align-top text-xs">
                        {new Date(row.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-0 align-top">
                        <OrderRowActions
                          orderId={row.id}
                          orderNumber={row.orderNumber}
                          status={row.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parseDateParam(value?: string, endOfDay = false): Date | null {
  if (!value) return null;
  const base = new Date(`${value}T00:00:00.000+07:00`);
  if (Number.isNaN(base.getTime())) return null;
  if (!endOfDay) return base;
  base.setHours(23, 59, 59, 999);
  return base;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === "paid" || status === "processing" || status === "delivered"
      ? "default"
      : status === "pending"
        ? "outline"
        : status === "cancelled" || status === "failed" || status === "refunded"
          ? "destructive"
          : "secondary";

  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

