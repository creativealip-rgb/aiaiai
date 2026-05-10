"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, { message: "Nama minimal 2 karakter." }).max(100),
    email: z.email({ message: "Alamat email tidak valid." }),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[+0-9 \-()]{6,20}$/.test(v), {
        message: "Nomor telepon tidak valid.",
      }),
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

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm({ showGoogle }: { showGoogle: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setSubmitting(true);
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      // Additional field — Better-Auth only lets fields with `input: true`
      // through. We configured `phone` as such in src/lib/auth.ts.
      phone: values.phone?.length ? values.phone : undefined,
    });

    if (error) {
      setSubmitting(false);
      toast.error(error.message ?? "Pendaftaran gagal.");
      return;
    }

    setSubmittedEmail(values.email);
    setSubmitting(false);
  }

  if (submittedEmail) {
    return (
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Cek inbox Anda</h2>
        <p className="text-muted-foreground text-sm">
          Kami sudah mengirim link verifikasi ke{" "}
          <span className="text-foreground font-medium">{submittedEmail}</span>. Klik link di email
          untuk mengaktifkan akun sebelum masuk.
        </p>
        <p className="text-muted-foreground mt-4 text-xs">
          Tidak menerima email? Periksa folder spam, atau coba daftar ulang setelah beberapa menit.
        </p>
        <div className="mt-6">
          <Link className="text-primary text-sm hover:underline" href="/login">
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
      <div className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold">Buat akun baru</h2>
        <p className="text-muted-foreground text-sm">
          Sudah punya akun?{" "}
          <Link className="text-primary hover:underline" href="/login">
            Masuk
          </Link>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Nama lengkap" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor WhatsApp (opsional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="+62812…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Digunakan admin untuk menghubungi Anda jika perlu.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
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
            {submitting ? "Memproses…" : "Daftar"}
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
          <GoogleSignInButton callbackURL="/dashboard" label="Daftar dengan Google" />
        </>
      ) : null}
    </div>
  );
}
