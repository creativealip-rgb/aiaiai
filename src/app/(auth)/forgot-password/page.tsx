"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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

const schema = z.object({
  email: z.email({ message: "Alamat email tidak valid." }),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    // Better-Auth will deliver the email (if the account exists); the response
    // is intentionally identical whether or not the email maps to a user, to
    // avoid user-enumeration.
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Gagal mengirim link reset.");
      return;
    }
    setSent(values.email);
  }

  if (sent) {
    return (
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Link reset sudah dikirim</h2>
        <p className="text-muted-foreground text-sm">
          Jika alamat <span className="text-foreground font-medium">{sent}</span> terdaftar di AI3,
          kami sudah mengirim link untuk mereset password. Cek inbox (dan folder spam) dalam
          beberapa menit ke depan.
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
        <h2 className="text-lg font-semibold">Reset password</h2>
        <p className="text-muted-foreground text-sm">
          Masukkan email Anda. Kami akan mengirim link untuk membuat password baru.
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Memproses…" : "Kirim link reset"}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center">
        <Link className="text-muted-foreground hover:text-foreground text-sm" href="/login">
          Kembali ke masuk
        </Link>
      </div>
    </div>
  );
}
