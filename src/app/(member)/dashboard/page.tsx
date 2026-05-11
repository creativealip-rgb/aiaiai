import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();

  // `balance` is a numeric/string from Postgres. Format for display.
  const balanceDisplay = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(user.balance ?? "0"));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Selamat datang, {user.name || user.email}
        </h1>
        <p className="text-muted-foreground text-sm">
          Ringkasan akun Anda. Katalog produk &amp; riwayat order aktif mulai Fase 2–3.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Saldo</CardDescription>
            <CardTitle className="text-2xl">{balanceDisplay}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Top-up &amp; pemakaian saldo tersedia di Fase 6.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Role</CardDescription>
            <CardTitle className="text-2xl capitalize">{user.role}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {user.role === "admin" ? "Anda memiliki akses admin." : "Akun member reguler."}
            </p>
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="bg-background hover:bg-muted inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium"
              >
                Buka admin panel
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat order</CardTitle>
          <CardDescription>Lihat detail pesanan dan kredensial akun yang terkirim.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/orders"
            className="bg-background hover:bg-muted inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium"
          >
            Buka riwayat order
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
