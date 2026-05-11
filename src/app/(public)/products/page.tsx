import type { Metadata } from "next";
import Link from "next/link";

import { CatalogFilterBar } from "@/components/product/catalog-filter-bar";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { listActiveCategories } from "@/server/queries/categories";
import { listPublicProducts, type ProductSort } from "@/server/queries/products";

export const metadata: Metadata = {
  title: "Semua produk",
  description:
    "Katalog akun digital & jasa digital AI3. Filter berdasarkan kategori, harga, dan tipe.",
  alternates: { canonical: "/products" },
};

type SearchParams = {
  search?: string;
  categorySlug?: string;
  type?: "account" | "service";
  minPrice?: string;
  maxPrice?: string;
  sort?: ProductSort;
  page?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [{ items, total, totalPages, pageSize }, categories] = await Promise.all([
    listPublicProducts({
      search: sp.search,
      categorySlug: sp.categorySlug,
      type: sp.type,
      minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
      maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
      sort: sp.sort,
      page,
      pageSize: 12,
    }),
    listActiveCategories(),
  ]);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Semua produk</h1>
        <p className="text-muted-foreground text-sm">
          Jelajahi {total > 0 ? `${total} produk` : "katalog"}. Filter sesuai kebutuhan.
        </p>
      </header>

      <CatalogFilterBar
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        initial={{
          search: sp.search ?? "",
          categorySlug: sp.categorySlug ?? "",
          type: sp.type ?? "",
          minPrice: sp.minPrice ?? "",
          maxPrice: sp.maxPrice ?? "",
          sort: sp.sort ?? "newest",
        }}
      />

      {items.length === 0 ? (
        <div className="border-muted text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          Tidak ada produk yang cocok dengan filter. Coba kurangi kriteria.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground text-xs">
              Menampilkan {startIdx}–{endIdx} dari {total}
            </span>
            {totalPages > 1 ? <Pager page={page} totalPages={totalPages} /> : null}
          </div>
        </>
      )}
    </div>
  );
}

function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        render={
          <Link
            href={page > 1 ? {
              pathname: "/products",
              query: { page: page - 1 },
            } : "#"}
          >
            Sebelumnya
          </Link>
        }
      />
      <span className="text-muted-foreground text-xs tabular-nums">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        render={
          <Link
            href={page < totalPages ? {
              pathname: "/products",
              query: { page: page + 1 },
            } : "#"}
          >
            Berikutnya
          </Link>
        }
      />
    </div>
  );
}
