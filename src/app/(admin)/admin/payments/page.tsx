import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatIdr } from "@/lib/price";
import {
  listAdminPayments,
  listPaymentGateways,
  normalizePaymentStatus,
  PAYMENT_STATUSES,
  summarizePaymentsByGateway,
  summarizePaymentsTotals,
} from "@/server/queries/admin-payments";

export const metadata: Metadata = {
  title: "Admin · Payments",
};

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    gateway?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;

  const status = normalizePaymentStatus(params.status);
  const q = params.q?.trim() ?? "";
  const from = parseDateParam(params.from);
  const to = parseDateParam(params.to, true);
  const gateways = await listPaymentGateways();
  const gateway = params.gateway && gateways.includes(params.gateway) ? params.gateway : "all";

  const filters = {
    status,
    gateway,
    q: q || undefined,
    from: from ?? undefined,
    to: to ?? undefined,
  } as const;

  const [rows, byGateway, totals] = await Promise.all([
    listAdminPayments({ ...filters, limit: 200 }),
    summarizePaymentsByGateway(filters),
    summarizePaymentsTotals(filters),
  ]);

  const exportQuery = new URLSearchParams();
  if (status !== "all") exportQuery.set("status", status);
  if (gateway !== "all") exportQuery.set("gateway", gateway);
  if (q) exportQuery.set("q", q);
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);
  const exportHref = `/api/admin/payments/export${exportQuery.toString() ? `?${exportQuery.toString()}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-muted-foreground text-sm">
            Rekap pembayaran per gateway dan export CSV.
          </p>
        </div>
        <Link href={exportHref} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          Export CSV
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total payment rows" value={`${totals.totalCount}`} />
        <SummaryCard label="Paid rows" value={`${totals.paidCount}`} />
        <SummaryCard label="Paid amount" value={formatIdr(totals.paidAmount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="q">
                Search
              </label>
              <Input id="q" name="q" placeholder="Order/email/ref/method" defaultValue={q} />
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
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="gateway">
                Gateway
              </label>
              <select
                id="gateway"
                name="gateway"
                defaultValue={gateway}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="all">Semua</option>
                {gateways.map((value) => (
                  <option key={value} value={value}>
                    {value}
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
            <div className="md:col-span-5">
              <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                Terapkan filter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekap per gateway</CardTitle>
        </CardHeader>
        <CardContent>
          {byGateway.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada data payment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Gateway</th>
                    <th className="py-2 pr-3 font-medium">Total rows</th>
                    <th className="py-2 pr-3 font-medium">Paid rows</th>
                    <th className="py-2 pr-0 font-medium">Paid amount</th>
                  </tr>
                </thead>
                <tbody>
                  {byGateway.map((row) => (
                    <tr key={row.gateway} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.gateway}</td>
                      <td className="py-2 pr-3">{row.totalCount}</td>
                      <td className="py-2 pr-3">{row.paidCount}</td>
                      <td className="py-2 pr-0 tabular-nums">{formatIdr(row.paidAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar payment ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada payment untuk filter ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Payment</th>
                    <th className="py-2 pr-3 font-medium">Gateway</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Customer</th>
                    <th className="py-2 pr-0 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{row.id}</div>
                        <div className="text-muted-foreground text-xs">{row.gatewayRef ?? "-"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div>{row.gateway}</div>
                        <div className="text-muted-foreground text-xs">{row.method ?? "-"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        <div>{formatIdr(row.amount)}</div>
                        {Number(row.fee) > 0 ? (
                          <div className="text-muted-foreground text-xs">fee {formatIdr(row.fee)}</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <Link href={`/order/${row.orderNumber}`} className="underline" target="_blank">
                          {row.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <div>{row.userName || "-"}</div>
                        <div className="text-muted-foreground text-xs">{row.userEmail}</div>
                      </td>
                      <td className="py-3 pr-0 text-xs">{new Date(row.createdAt).toLocaleString("id-ID")}</td>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardHeader>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid"
      ? "default"
      : status === "pending"
        ? "outline"
        : status === "refunded" || status === "failed"
          ? "destructive"
          : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

