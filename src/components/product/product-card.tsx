import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { discountPercent, effectivePrice, formatIdr } from "@/lib/price";
import { cn } from "@/lib/utils";
import type { PublicProductCard } from "@/server/queries/products";

/**
 * Compact product card used in the landing grid, the catalog grid,
 * and the "related products" rail on the detail page.
 */
export function ProductCard({
  product,
  className,
}: {
  product: PublicProductCard;
  className?: string;
}) {
  const price = effectivePrice(product.basePrice, product.discountPrice);
  const discount = discountPercent(product.basePrice, product.discountPrice);
  const rating = Number(product.ratingAvg ?? 0);

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group/card focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
    >
      <Card className="h-full gap-3 transition-shadow group-hover/card:shadow-md">
        <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-200 group-hover/card:scale-105"
              unoptimized
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              Tanpa gambar
            </div>
          )}
          {discount !== null ? (
            <Badge className="absolute top-2 left-2 bg-rose-600 hover:bg-rose-600">
              -{discount}%
            </Badge>
          ) : null}
          {product.type === "service" ? (
            <Badge
              variant="outline"
              className="absolute top-2 right-2 bg-white/90 backdrop-blur"
            >
              Jasa
            </Badge>
          ) : null}
        </div>
        <CardContent className="space-y-2">
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            {product.categoryName}
          </div>
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold tabular-nums">{formatIdr(price)}</span>
            {discount !== null ? (
              <span className="text-muted-foreground text-xs line-through tabular-nums">
                {formatIdr(product.basePrice)}
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {product.ratingCount > 0 ? (
              <span>
                ★ {rating.toFixed(1)} ({product.ratingCount})
              </span>
            ) : (
              <span className="italic">belum ada ulasan</span>
            )}
            <span className="text-muted-foreground/60">·</span>
            <span>terjual {product.soldCount}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
