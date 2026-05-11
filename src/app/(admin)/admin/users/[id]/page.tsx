import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIdr } from "@/lib/price";
import { getAdminUserDetail, listOrdersByUserForAdmin } from "@/server/queries/admin-users";

import { UserActions } from "../user-actions";

export const metadata: Metadata = {
  title: "Admin · User Detail",
};

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, orders] = await Promise.all([
    getAdminUserDetail(id),
    listOrdersByUserForAdmin(id),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/users" className="text-muted-foreground text-sm hover:underline">
          ← Kembali ke users
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{user.name || "-"}</h1>
        <p className="text-muted-foreground text-sm">{user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil user</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <Row label="Role" value={<Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role}</Badge>} />
            <Row label="Status" value={<Badge variant={user.isBanned ? "destructive" : "outline"}>{user.isBanned ? "banned" : "active"}</Badge>} />
            <Row label="Email verified" value={user.emailVerified ? "Ya" : "Belum"} />
            <Row label="Phone" value={user.phone ?? "-"} />
            <Row label="Balance" value={formatIdr(user.balance)} />
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Dibuat" value={new Date(user.createdAt).toLocaleString("id-ID")} />
            <Row label="Last login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID") : "-"} />
            <Row label="Claimed at" value={user.claimedAt ? new Date(user.claimedAt).toLocaleString("id-ID") : "-"} />
            <Row label="Total order" value={`${user.orderCount}`} />
            <Row label="Paid order" value={`${user.paidOrderCount}`} />
          </div>

          <div className="md:col-span-2">
            <UserActions userId={user.id} userEmail={user.email} isBanned={user.isBanned} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat order user</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada order.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Total</th>
                    <th className="py-2 pr-3 font-medium">Dibuat</th>
                    <th className="py-2 pr-0 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">{order.orderNumber}</td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline">{order.status}</Badge>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{formatIdr(order.total ?? "0")}</td>
                      <td className="py-3 pr-3 text-xs">
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-0">
                        <Link href="/admin/orders" className="text-xs underline">
                          Kelola di orders
                        </Link>
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

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <div className="text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
