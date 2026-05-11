import type { Metadata } from "next";

import { getSession } from "@/server/auth";

import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await getSession();
  const checkoutUser = session?.user
    ? {
        email: session.user.email,
        name: session.user.name ?? "",
        phone: session.user.phone ?? "",
        balance: Number(session.user.balance ?? "0"),
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutForm user={checkoutUser} />
    </div>
  );
}
