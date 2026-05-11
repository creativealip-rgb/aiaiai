"use client";

/**
 * Client-only bits of the product detail view:
 *   - Image gallery with thumbnail switcher.
 *   - Variant selector (stores selection in local state; Phase 3 will
 *     wire it to the cart store).
 *
 * Keeping this isolated from the Server Component above so the image state
 * + variant state don't force the whole page into client rendering.
 */

import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductVariant } from "@/db/schema";
import { formatIdr } from "@/lib/price";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";

export function ProductDetailClient({
  images,
  thumbnailUrl,
  name,
  variants,
}: {
  images: string[];
  thumbnailUrl: string | null;
  name: string;
  variants: ProductVariant[];
}) {
  const gallery = images.length > 0 ? images : thumbnailUrl ? [thumbnailUrl] : [];
  const [activeImage, setActiveImage] = useState(gallery[0] ?? null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const canBuy = selectedVariant !== null;

  function handleAddToCart() {
    if (!selectedVariant) return;
    useCartStore.getState().addItem({
      productId: variants[0]?.productId ?? "",
      variantId: selectedVariant.id,
      qty: 1,
      productName: name,
      variantName: selectedVariant.name,
      price: Number(selectedVariant.price),
      stockMode: selectedVariant.stockMode,
      thumbnailUrl: gallery[0] ?? null,
      slug: "",
    });
    toast.success(`"${selectedVariant.name}" ditambahkan ke keranjang.`);
  }

  return (
    <div className="space-y-5">
      <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-xl border">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={name}
            fill
            sizes="(max-width: 1024px) 100vw, 600px"
            className="object-cover"
            priority
            unoptimized
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Tidak ada gambar untuk produk ini.
          </div>
        )}
      </div>

      {gallery.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {gallery.map((url, idx) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActiveImage(url)}
                aria-label={`Lihat gambar ${idx + 1}`}
                aria-pressed={activeImage === url}
                className={cn(
                  "bg-muted relative size-16 overflow-hidden rounded-md border transition-all",
                  activeImage === url
                    ? "border-primary ring-primary/30 ring-2"
                    : "border-border hover:border-muted-foreground",
                )}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {variants.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Pilih varian</h2>
          <ul className="space-y-2">
            {variants.map((variant) => {
              const isActive = selectedVariantId === variant.id;
              return (
                <li key={variant.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                      isActive
                        ? "border-primary ring-primary/20 ring-2"
                        : "border-border hover:border-muted-foreground",
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {variant.name}
                        {variant.stockMode === "unlimited" ? (
                          <Badge variant="outline">unlimited</Badge>
                        ) : null}
                      </div>
                      {variant.description ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {variant.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="font-semibold">{formatIdr(variant.price)}</span>
                      {isActive ? <CheckIcon className="text-primary size-4" /> : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={!canBuy}
          onClick={handleAddToCart}
        >
          <ShoppingCartIcon />
          Tambah ke keranjang
        </Button>
      </div>
    </div>
  );
}
