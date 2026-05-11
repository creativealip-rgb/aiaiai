import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownDescription } from "@/components/product/markdown-description";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailClient } from "@/components/product/product-detail";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env";
import { discountPercent, effectivePrice, formatIdr } from "@/lib/price";
import {
  getActiveProductBySlug,
  listRelatedProducts,
} from "@/server/queries/products";

// Product details can be ISR'd — admin edits trigger `revalidatePath` on the
// exact slug (see actions). `revalidate = 300` keeps it reasonable for traffic
// that arrives faster than a round-trip admin edit → save.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) {
    return {
      title: "Produk tidak ditemukan",
      robots: { index: false },
    };
  }

  const price = effectivePrice(product.basePrice, product.discountPrice);
  const description =
    (product.description ?? "")
      // Strip light markdown for the meta description — a simple truncation
      // is fine; production could use remark to render plain text properly.
      .replace(/[#*_`]/g, "")
      .slice(0, 160) || `${product.name} — harga mulai ${formatIdr(price)}.`;

  const canonical = `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/products/${product.slug}`;

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      images: product.thumbnailUrl ? [product.thumbnailUrl] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const related = await listRelatedProducts(product.id, product.categoryId, 4);

  const price = effectivePrice(product.basePrice, product.discountPrice);
  const discount = discountPercent(product.basePrice, product.discountPrice);

  // Build JSON-LD Product schema for rich snippets.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.length > 0 ? product.images : undefined,
    brand: env.NEXT_PUBLIC_APP_NAME,
    category: product.category.name,
    offers: product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        "@type": "Offer",
        sku: variant.sku,
        price: Number(variant.price),
        priceCurrency: "IDR",
        availability: "https://schema.org/InStock",
        name: variant.name,
      })),
    aggregateRating:
      product.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.ratingAvg),
            reviewCount: product.ratingCount,
          }
        : undefined,
  };

  return (
    <article className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground text-xs">
        <Link href="/products" className="hover:text-foreground">
          Produk
        </Link>
        <span className="mx-1.5">›</span>
        <Link href={`/c/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <ProductDetailClient
          images={product.images}
          thumbnailUrl={product.thumbnailUrl}
          name={product.name}
          variants={product.variants.filter((v) => v.isActive)}
        />

        <aside className="space-y-6">
          <div className="space-y-2">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{product.category.name}</Badge>
              <Badge variant="outline">{product.type === "account" ? "Akun" : "Jasa"}</Badge>
              <Badge variant="outline">
                {product.deliveryType === "auto" ? "Auto-delivery" : "Manual"}
              </Badge>
              {product.warrantyDays > 0 ? (
                <Badge variant="outline">Garansi {product.warrantyDays} hari</Badge>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              {product.ratingCount > 0 ? (
                <span>
                  ★ {Number(product.ratingAvg).toFixed(1)} · {product.ratingCount} ulasan
                </span>
              ) : (
                <span className="italic">Belum ada ulasan</span>
              )}
              <span>·</span>
              <span>terjual {product.soldCount}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold tabular-nums">{formatIdr(price)}</div>
            {discount !== null ? (
              <>
                <div className="text-muted-foreground text-sm line-through tabular-nums">
                  {formatIdr(product.basePrice)}
                </div>
                <Badge className="bg-rose-600 hover:bg-rose-600">-{discount}%</Badge>
              </>
            ) : null}
          </div>

          {product.variants.filter((v) => v.isActive).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Produk ini belum memiliki varian aktif. Silakan hubungi admin.
            </p>
          ) : null}
        </aside>
      </div>

      {product.description ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Deskripsi</h2>
          {/* Rendered server-side from markdown. */}
          <MarkdownDescription content={product.description} />
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Produk serupa</h2>
            <Link
              className="text-muted-foreground hover:text-foreground text-sm"
              href={`/c/${product.category.slug}`}
            >
              Lihat semua {product.category.name.toLowerCase()} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
