import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { formatIdr } from "@/lib/price";
import { getSession } from "@/server/auth";
import { verifyAndTouchOrderAccessToken } from "@/server/services/orders";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Status order",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu pembayaran",
  paid: "Dibayar",
  processing: "Diproses",
  delivered: "Terkirim",
  partial_delivered: "Sebagian terkirim",
  cancelled: "Dibatalkan",
  refunded: "Direfund",
  failed: "Gagal",
};

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;

  const [row] = await db
    .select({ order: orders, owner: users })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!row) notFound();

  const { order, owner } = row;
  const session = await getSession();

  if (session?.user?.id) {
    if (session.user.id !== order.userId) {
      notFound();
    }
  } else {
    if (owner.claimedAt) {
      // Once claimed, force access through authenticated dashboard flow.
      notFound();
    }

    const token =
      typeof query.token === "string"
        ? query.token
        : Array.isArray(query.token)
          ? query.token[0]
          : undefined;

    if (!token) notFound();
    const valid = await verifyAndTouchOrderAccessToken(order.id, token);
    if (!valid) notFound();
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
        <p className="text-muted-foreground text-sm">
          Dibuat {new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Status
            <StatusBadge status={order.status} />
          </CardTitle>
          <CardDescription>
            {order.status === "pending"
              ? `Selesaikan pembayaran sebelum ${new Date(order.expiresAt!).toLocaleString("id-ID", { timeStyle: "short" })}.`
              : order.status === "paid"
                ? "Pembayaran diterima. Pesanan sedang diproses."
                : order.status === "delivered"
                  ? "Pesanan sudah terkirim."
                  : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y text-sm">
            {items.map((item) => {
              const snap = item.productSnapshot as { productName?: string; variantName?: string } | null;
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <div className="font-medium">{snap?.productName ?? "Produk"}</div>
                    <div className="text-muted-foreground text-xs">
                      {snap?.variantName ?? "Varian"} × {item.qty}
                    </div>
                  </div>
                  <div className="tabular-nums">{formatIdr(item.lineTotal)}</div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t pt-3 font-semibold">
            <span>Total</span>
            <span className="text-lg tabular-nums">{formatIdr(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Kehilangan link?{" "}
        <Link href="/order/access" className="underline">
          Minta ulang akses order
        </Link>
        .
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const variant =
    status === "paid" || status === "delivered"
      ? "default"
      : status === "pending"
        ? "outline"
        : status === "cancelled" || status === "failed" || status === "refunded"
          ? "destructive"
          : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}
