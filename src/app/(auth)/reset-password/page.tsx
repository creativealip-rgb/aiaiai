import type { Metadata } from "next";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Atur ulang password",
};

// Forces dynamic rendering so `useSearchParams` (reading ?token / ?error in
// the client form) doesn't need a separate Suspense bailout at build time.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
