import type { Metadata } from "next";

import { OrderAccessRequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "Minta Ulang Link Order",
};

export default function OrderAccessRequestPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <OrderAccessRequestForm />
    </div>
  );
}

