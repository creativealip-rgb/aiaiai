import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIdr } from "@/lib/price";
import { listOrdersByUser } from "@/server/queries/orders";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Dashboard · Orders",
};

export default async function DashboardOrdersPage() {
  const user = await requireUser();
  const orders = await listOrdersByUser(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Riwayat order</h1>
        <p className="text-muted-foreground text-sm">Semua order yang terhubung ke akun Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada order.</p>
          ) : (
            orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40"
              >
                <div>
                  <div className="font-medium">{order.orderNumber}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(order.createdAt).toLocaleString("id-ID")} · {order.itemCount} item
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">
                    {order.status}
                  </Badge>
                  <div className="text-sm tabular-nums">{formatIdr(order.total)}</div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

