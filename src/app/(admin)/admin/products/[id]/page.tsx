import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { VariantsManager } from "@/components/admin/variants-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategoriesWithCounts } from "@/server/queries/categories";
import { getAdminProductById } from "@/server/queries/products";

export const metadata: Metadata = {
  title: "Admin · Edit produk",
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    listCategoriesWithCounts(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground font-mono text-xs">/{product.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/products/${product.slug}`} target="_blank">Lihat publik ↗</Link>}
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/products">← Daftar produk</Link>}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail produk</CardTitle>
          <CardDescription>Perubahan tersimpan saat Anda menekan &ldquo;Simpan&rdquo;.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="edit"
            categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
            product={product}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <VariantsManager
            productId={product.id}
            variants={product.variants}
            canDelete={product.variants.length > 1}
          />
        </CardContent>
      </Card>
    </div>
  );
}
