import Link from "next/link";
import { Suspense } from "react";

import { ProductCard } from "@/components/product/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listActiveCategories } from "@/server/queries/categories";
import { listFeaturedProducts } from "@/server/queries/products";

export const revalidate = 300; // ISR: refresh landing every 5 min

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:py-14">
      <section className="space-y-4 text-center sm:space-y-6">
        <Badge variant="outline" className="mx-auto">
          Marketplace akun & jasa digital
        </Badge>
        <h1 className="mx-auto max-w-3xl text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
          Akun streaming, AI, dan produktifitas — harga bersahabat, garansi aktif.
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
          Netflix, Spotify, ChatGPT, Canva, dan banyak lagi. Pengiriman otomatis, pembayaran QRIS
          / VA / e-wallet, bantuan 24/7.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/products">Jelajahi produk</Link>} />
          <Button
            variant="outline"
            size="lg"
            render={<Link href="/register">Daftar gratis</Link>}
          />
        </div>
      </section>

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection />
      </Suspense>

      <Suspense fallback={<ProductsSkeleton title="Produk unggulan" />}>
        <FeaturedSection />
      </Suspense>

      <section className="grid gap-4 sm:grid-cols-3">
        <ValueCard
          title="Pengiriman otomatis"
          body="Sebagian besar produk akun terkirim otomatis setelah pembayaran lunas — langsung muncul di dashboard Anda."
        />
        <ValueCard
          title="Garansi aktif"
          body="Ganti kredensial gratis selama periode garansi bila akun bermasalah."
        />
        <ValueCard
          title="Bayar mudah"
          body="Bayar via QRIS, virtual account, e-wallet (OVO, DANA, GoPay, ShopeePay) — lewat Mayar."
        />
      </section>
    </div>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </CardContent>
    </Card>
  );
}

async function CategoriesSection() {
  const categories = await listActiveCategories();
  if (categories.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">Kategori</h2>
        <Link className="text-muted-foreground hover:text-foreground text-sm" href="/products">
          Lihat semua →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group/cat focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Card className="h-full transition-shadow group-hover/cat:shadow-md">
              <CardContent className="py-5">
                <div className="text-lg font-semibold">{category.name}</div>
                {category.description ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {category.description}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-24" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </section>
  );
}

async function FeaturedSection() {
  const products = await listFeaturedProducts(8);
  if (products.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">Produk unggulan</h2>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/products?sort=popular"
        >
          Paling laris →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductsSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </section>
  );
}
