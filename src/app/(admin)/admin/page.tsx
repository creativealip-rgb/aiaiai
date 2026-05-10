import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin · Dashboard",
};

/**
 * Placeholder admin dashboard. Real widgets (revenue, orders, stock alerts,
 * audit log) land in Fase 5.
 */
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-muted-foreground text-sm">
          Placeholder Fase 1. Dashboard statistik, CRUD produk, order, dan user akan dibangun di
          Fase 2–5.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard title="Produk" phase="Fase 2" />
        <PlaceholderCard title="Kategori" phase="Fase 2" />
        <PlaceholderCard title="Orders" phase="Fase 3" />
        <PlaceholderCard title="Stok akun" phase="Fase 4" />
        <PlaceholderCard title="Users" phase="Fase 5" />
        <PlaceholderCard title="Voucher" phase="Fase 6" />
      </div>
    </div>
  );
}

function PlaceholderCard({ title, phase }: { title: string; phase: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{phase}</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Belum tersedia.</p>
      </CardContent>
    </Card>
  );
}
