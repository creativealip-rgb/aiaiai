"use client";

/**
 * Client-side filter bar for the public catalog.
 *
 * Uses URL search params as the source of truth so filters survive
 * reloads and are shareable. Submits as a plain <form action> → React's
 * `startTransition` surfaces pending state while the Server Component re-renders.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductSort } from "@/server/queries/products";

type Initial = {
  search: string;
  categorySlug: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  sort: ProductSort;
};

export function CatalogFilterBar({
  categories,
  initial,
  basePath = "/products",
  hideCategory = false,
}: {
  categories: { slug: string; name: string }[];
  initial: Initial;
  basePath?: string;
  hideCategory?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const sp = new URLSearchParams();
    const search = String(formData.get("search") ?? "").trim();
    const categorySlug = String(formData.get("categorySlug") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const minPrice = String(formData.get("minPrice") ?? "").trim();
    const maxPrice = String(formData.get("maxPrice") ?? "").trim();
    const sort = String(formData.get("sort") ?? "").trim();

    if (search) sp.set("search", search);
    if (!hideCategory && categorySlug && categorySlug !== "all")
      sp.set("categorySlug", categorySlug);
    if (type && type !== "all") sp.set("type", type);
    if (minPrice) sp.set("minPrice", minPrice);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    if (sort && sort !== "newest") sp.set("sort", sort);

    const query = sp.toString();
    startTransition(() => {
      router.push(query ? `${basePath}?${query}` : basePath);
    });
  }

  function reset() {
    startTransition(() => router.push(basePath));
  }

  // Force-remount on URL change so uncontrolled inputs stay in sync.
  const key = searchParams.toString();

  return (
    <form
      key={key}
      action={submit}
      className="bg-muted/30 grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto_auto]"
    >
      <Input
        name="search"
        placeholder="Cari produk…"
        defaultValue={initial.search}
        aria-label="Cari produk"
      />
      {hideCategory ? null : (
        <Select name="categorySlug" defaultValue={initial.categorySlug || "all"}>
          <SelectTrigger aria-label="Filter kategori" className="w-full">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select name="type" defaultValue={initial.type || "all"}>
        <SelectTrigger aria-label="Filter tipe" className="w-full">
          <SelectValue placeholder="Tipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua tipe</SelectItem>
          <SelectItem value="account">Akun</SelectItem>
          <SelectItem value="service">Jasa</SelectItem>
        </SelectContent>
      </Select>
      <Input
        name="minPrice"
        placeholder="Harga min"
        defaultValue={initial.minPrice}
        type="number"
        min={0}
        inputMode="numeric"
        aria-label="Harga minimum"
      />
      <Input
        name="maxPrice"
        placeholder="Harga max"
        defaultValue={initial.maxPrice}
        type="number"
        min={0}
        inputMode="numeric"
        aria-label="Harga maksimum"
      />
      <Select name="sort" defaultValue={initial.sort ?? "newest"}>
        <SelectTrigger aria-label="Urutkan" className="w-full">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Terbaru</SelectItem>
          <SelectItem value="popular">Terlaris</SelectItem>
          <SelectItem value="price_asc">Harga termurah</SelectItem>
          <SelectItem value="price_desc">Harga tertinggi</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Memuat…" : "Terapkan"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset} disabled={pending}>
          Reset
        </Button>
      </div>
    </form>
  );
}
