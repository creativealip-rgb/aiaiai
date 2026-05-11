import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { listAdminPayments, normalizePaymentStatus } from "@/server/queries/admin-payments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = normalizePaymentStatus(url.searchParams.get("status") ?? undefined);
  const gateway = url.searchParams.get("gateway")?.trim() || "all";
  const q = url.searchParams.get("q")?.trim() || "";
  const from = parseDateParam(url.searchParams.get("from") ?? undefined);
  const to = parseDateParam(url.searchParams.get("to") ?? undefined, true);

  const rows = await listAdminPayments({
    status,
    gateway,
    q: q || undefined,
    from: from ?? undefined,
    to: to ?? undefined,
    limit: 2000,
  });

  const header = [
    "payment_id",
    "gateway",
    "gateway_ref",
    "status",
    "method",
    "amount",
    "fee",
    "order_number",
    "user_email",
    "user_name",
    "paid_at",
    "created_at",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    const fields = [
      row.id,
      row.gateway,
      row.gatewayRef ?? "",
      row.status,
      row.method ?? "",
      row.amount,
      row.fee,
      row.orderNumber,
      row.userEmail,
      row.userName ?? "",
      row.paidAt ? row.paidAt.toISOString() : "",
      row.createdAt.toISOString(),
    ].map(csvEscape);
    lines.push(fields.join(","));
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function parseDateParam(value?: string, endOfDay = false): Date | null {
  if (!value) return null;
  const base = new Date(`${value}T00:00:00.000+07:00`);
  if (Number.isNaN(base.getTime())) return null;
  if (!endOfDay) return base;
  base.setHours(23, 59, 59, 999);
  return base;
}

function csvEscape(value: string): string {
  const normalized = value.replaceAll('"', '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

