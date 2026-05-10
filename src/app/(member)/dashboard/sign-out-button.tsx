"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { cloneElement, useState } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Wraps any single element (typically a <Button>) and attaches a sign-out
 * handler. The `nextCookies()` Better-Auth plugin clears the session cookie
 * server-side; we then `router.refresh()` so the proxy bounces the user back
 * to /login.
 */
export function SignOutButton({ children }: { children: ReactElement<Record<string, unknown>> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return cloneElement(children, {
    disabled: loading,
    onClick: async () => {
      setLoading(true);
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    },
  });
}
