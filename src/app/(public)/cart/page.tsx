import type { Metadata } from "next";

import { CartClientPage } from "./cart-client";

export const metadata: Metadata = {
  title: "Keranjang",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartClientPage />;
}

