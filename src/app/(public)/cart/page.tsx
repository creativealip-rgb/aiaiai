"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart";
import { formatIdr } from "@/lib/price";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, getTotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Keranjang Kosong</h1>
        <p className="mt-2 text-muted-foreground">Belum ada produk di keranjang.</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>Mulai Belanja</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Keranjang</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={`${item.productId}-${item.variantId}`} className="flex items-center gap-4 p-4">
            {item.thumbnailUrl && (
              <div className="bg-muted relative h-16 w-16 overflow-hidden rounded">
                <Image src={item.thumbnailUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
              <p className="text-sm">{formatIdr(item.price)}</p>
              {item.stockMode === "tracked" ? (
                <p className="text-xs text-muted-foreground">Stok varian ini dilacak dan diverifikasi saat checkout.</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)} disabled={item.qty <= 1}>
                −
              </Button>
              <span className="w-6 text-center">{item.qty}</span>
              <Button variant="outline" size="sm" onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)} disabled={item.qty >= 10}>
                +
              </Button>
            </div>
            <p className="w-24 text-right font-medium">{formatIdr(item.price * item.qty)}</p>
            <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId, item.variantId)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <p className="text-lg font-bold">Subtotal: {formatIdr(getTotal())}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearCart}>Kosongkan keranjang</Button>
          <Link href="/checkout" className={buttonVariants({ variant: "default" })}>Lanjut ke checkout</Link>
        </div>
      </div>
    </div>
  );
}
