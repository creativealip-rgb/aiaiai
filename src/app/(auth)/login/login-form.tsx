"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
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

const loginSchema = z.object({
  email: z.email({ message: "Alamat email tidak valid." }),
  password: z.string().min(1, { message: "Password wajib diisi." }),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ showGoogle }: { showGoogle: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Only allow relative redirects to prevent open-redirect abuse.
  const callbackURL = nextParam.startsWith("/") ? nextParam : "/dashboard";

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL,
      rememberMe: true,
    });

    if (error) {
      setSubmitting(false);
      // Better-Auth returns 403 when email is not verified yet.
      if (error.status === 403) {
        toast.error("Email belum diverifikasi. Cek inbox untuk link verifikasi.");
        return;
      }
      toast.error(error.message ?? "Gagal masuk. Periksa kembali kredensial Anda.");
      return;
    }

    // On success Better-Auth sets the session cookie; push to destination.
    router.push(callbackURL);
    router.refresh();
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
      <div className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold">Masuk ke akun Anda</h2>
        <p className="text-muted-foreground text-sm">
          Belum punya akun?{" "}
          <Link className="text-primary hover:underline" href="/register">
            Daftar
          </Link>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                  >
                    Lupa password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </Form>

      {showGoogle ? (
        <>
          <div className="my-4 flex items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs tracking-wide uppercase">atau</span>
            <div className="bg-border h-px flex-1" />
          </div>
          <GoogleSignInButton callbackURL={callbackURL} label="Masuk dengan Google" />
        </>
      ) : null}
    </div>
  );
}
