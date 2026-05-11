import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategoriesWithCounts } from "@/server/queries/categories";

import { CategoriesManager } from "./categories-manager";

export const metadata: Metadata = {
  title: "Admin · Kategori",
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesWithCounts();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Kategori</h1>
          <p className="text-muted-foreground text-sm">
            Kelola taksonomi katalog. Urutan mengikuti <code>sort order</code> (kecil lebih dulu).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar kategori</CardTitle>
          <CardDescription>
            {categories.length} kategori terdaftar. Nonaktifkan (bukan hapus) kalau kategori masih
            pernah dipakai agar URL tetap rapi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager initialCategories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
