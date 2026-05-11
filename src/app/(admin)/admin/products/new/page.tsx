import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategoriesWithCounts } from "@/server/queries/categories";

export const metadata: Metadata = {
  title: "Admin · Produk baru",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await listCategoriesWithCounts();
  if (categories.length === 0) {
    redirect("/admin/categories");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Produk baru</h1>
          <p className="text-muted-foreground text-sm">
            Isi detail produk dan minimal 1 varian. Slug otomatis dihasilkan bila kosong.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/products">← Kembali</Link>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail produk</CardTitle>
          <CardDescription>Informasi dasar, harga, dan varian.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="create"
            categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
