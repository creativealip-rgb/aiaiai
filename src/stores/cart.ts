import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId: string;
  qty: number;
  productName: string;
  variantName: string;
  price: number;
  stockMode: "tracked" | "unlimited";
  thumbnailUrl: string | null;
  slug: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQty: (productId: string, variantId: string, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? { ...i, qty: Math.min(i.qty + (item.qty ?? 1), 10) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, qty: Math.min(item.qty ?? 1, 10) }] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        })),
      updateQty: (productId, variantId, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, qty: Math.max(1, Math.min(qty, 10)) }
              : i,
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: "ai3-cart" },
  ),
);
