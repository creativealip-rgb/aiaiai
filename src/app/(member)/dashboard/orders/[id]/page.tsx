import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIdr } from "@/lib/price";
import { requireUser } from "@/server/auth";
import { getOrderDetailForUser } from "@/server/queries/orders";

import { CredentialRevealCard } from "./credential-reveal-card";

export const metadata: Metadata = {
  title: "Dashboard · Detail Order",
};

export default async function DashboardOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderDetailForUser(id, user.id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/dashboard/orders" className="text-muted-foreground text-sm hover:underline">
          ← Kembali ke daftar order
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
        <p className="text-muted-foreground text-sm">
          Dibuat {new Date(order.createdAt).toLocaleString("id-ID")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Status order</span>
            <Badge variant="outline">{order.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Total: {formatIdr(order.total)}</div>
          <div>Dibayar: {order.paidAt ? new Date(order.paidAt).toLocaleString("id-ID") : "-"}</div>
          <div>
            Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("id-ID") : "-"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-muted-foreground text-xs">
                    {item.variantName} × {item.qty}
                  </div>
                </div>
                <div className="text-sm tabular-nums">{formatIdr(item.lineTotal)}</div>
              </div>

              {item.hasCredential ? (
                <CredentialRevealCard orderItemId={item.id} />
              ) : (
                <p className="text-muted-foreground text-xs">Item ini tidak memiliki kredensial akun.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

