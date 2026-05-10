"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter." })
      .max(128, { message: "Password maksimal 128 karakter." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok.",
  });
type Values = z.infer<typeof schema>;

/**
 * Client form for /reset-password. Invoked after the user clicks the reset
 * link in their email. Better-Auth redirects here with `?token=...` on
 * success or `?error=INVALID_TOKEN` if the token is expired / reused.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: Values) {
    if (!token) return;
    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    setSubmitting(false);
    if (resetError) {
      toast.error(resetError.message ?? "Gagal mengatur ulang password.");
      return;
    }
    toast.success("Password berhasil diatur ulang. Silakan masuk.");
    router.push("/login");
  }

  if (error || !token) {
    return (
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Link tidak valid</h2>
        <p className="text-muted-foreground text-sm">
          Link reset password sudah kadaluarsa atau sudah pernah digunakan. Silakan ajukan ulang
          permintaan reset password.
        </p>
        <div className="mt-6">
          <Link className="text-primary text-sm hover:underline" href="/forgot-password">
            Minta link baru
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
      <div className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold">Atur password baru</h2>
        <p className="text-muted-foreground text-sm">
          Buat password baru untuk akun AI3 Anda. Semua sesi lain akan keluar otomatis.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password baru</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konfirmasi password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Memproses…" : "Atur ulang password"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
