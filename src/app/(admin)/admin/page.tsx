import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { categories, products, productVariants } from "@/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { formatIdr } from "@/lib/price";

export const metadata: Metadata = {
  title: "Admin · Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Lightweight admin dashboard. Full revenue charts + order KPIs land in
 * Fase 5 (Admin Panel). For now: counts + a shortcut to the most recent
 * products so admins land on something actionable.
 */
export default async function AdminDashboardPage() {
  const [counts, recent] = await Promise.all([
    getCounts(),
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        basePrice: products.basePrice,
        discountPrice: products.discountPrice,
        isActive: products.isActive,
        deletedAt: products.deletedAt,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
      .limit(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-muted-foreground text-sm">
          Ringkasan katalog. Order & pembayaran tersedia di Fase 3 – 5.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Produk aktif" value={counts.activeProducts} hint="Terlihat di katalog" />
        <StatCard
          title="Produk non-aktif"
          value={counts.inactiveProducts}
          hint="Tersembunyi dari katalog"
        />
        <StatCard title="Varian" value={counts.variants} hint="Total (aktif + nonaktif)" />
        <StatCard title="Kategori aktif" value={counts.activeCategories} hint="Total terdaftar" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produk terbaru</CardTitle>
          <CardDescription>5 produk yang paling baru dibuat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed p-4 text-sm">
              <span className="text-muted-foreground">Belum ada produk.</span>
              <Button
                size="sm"
                render={<Link href="/admin/products/new">Buat produk pertama</Link>}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    <div className="text-muted-foreground font-mono text-xs">/{product.slug}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm tabular-nums">
                      {formatIdr(product.discountPrice ?? product.basePrice)}
                    </div>
                    {product.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                        aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline">nonaktif</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <PlaceholderCard title="Orders" phase="Fase 3" />
        <PlaceholderCard title="Stok akun" phase="Fase 4" />
        <PlaceholderCard title="Voucher" phase="Fase 6" />
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

function StatCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value.toLocaleString("id-ID")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
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
