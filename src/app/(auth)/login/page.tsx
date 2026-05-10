import type { Metadata } from "next";

import { LoginForm } from "./login-form";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Masuk",
};

// Auth pages read `next`, cookies, etc. at request time — no benefit to
// static pre-rendering, and useSearchParams in the client form requires a
// client-side bailout that `force-dynamic` satisfies cleanly.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const showGoogle = env.GOOGLE_CLIENT_ID.length > 0 && env.GOOGLE_CLIENT_SECRET.length > 0;
  return <LoginForm showGoogle={showGoogle} />;
}
