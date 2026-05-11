import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CatalogFilterBar } from "@/components/product/catalog-filter-bar";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import {
  getActiveCategoryBySlug,
  listActiveCategories,
} from "@/server/queries/categories";
import { listPublicProducts, type ProductSort } from "@/server/queries/products";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getActiveCategoryBySlug(slug);
  if (!category) {
    return { title: "Kategori tidak ditemukan", robots: { index: false } };
  }
  const canonical = `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/c/${category.slug}`;
  return {
    title: `${category.name} — katalog`,
    description:
      category.description ?? `Jelajahi produk kategori ${category.name} di ${env.NEXT_PUBLIC_APP_NAME}.`,
    alternates: { canonical },
    openGraph: {
      title: `${category.name} — ${env.NEXT_PUBLIC_APP_NAME}`,
      description: category.description ?? undefined,
      url: canonical,
      type: "website",
    },
  };
}

type SearchParams = {
  search?: string;
  type?: "account" | "service";
  minPrice?: string;
  maxPrice?: string;
  sort?: ProductSort;
  page?: string;
};

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { category: slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const category = await getActiveCategoryBySlug(slug);
  if (!category) notFound();

  const [{ items, total, totalPages, pageSize }, categories] = await Promise.all([
    listPublicProducts({
      search: sp.search,
      categorySlug: slug,
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

  const basePath = `/c/${slug}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <nav className="text-muted-foreground text-xs" aria-label="Breadcrumb">
          <Link href="/products" className="hover:text-foreground">
            Produk
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-foreground">{category.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{category.name}</h1>
        {category.description ? (
          <p className="text-muted-foreground max-w-3xl text-sm">{category.description}</p>
        ) : null}
      </header>

      <CatalogFilterBar
        basePath={basePath}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        hideCategory
        initial={{
          search: sp.search ?? "",
          categorySlug: slug,
          type: sp.type ?? "",
          minPrice: sp.minPrice ?? "",
          maxPrice: sp.maxPrice ?? "",
          sort: sp.sort ?? "newest",
        }}
      />

      {items.length === 0 ? (
        <div className="border-muted text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          Belum ada produk di kategori {category.name}.
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
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  disabled={page <= 1}
                  render={
                    <Link
                      href={
                        page > 1
                          ? { pathname: basePath, query: { page: page - 1 } }
                          : "#"
                      }
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
                  nativeButton={false}
                  disabled={page >= totalPages}
                  render={
                    <Link
                      href={
                        page < totalPages
                          ? { pathname: basePath, query: { page: page + 1 } }
                          : "#"
                      }
                    >
                      Berikutnya
                    </Link>
                  }
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
