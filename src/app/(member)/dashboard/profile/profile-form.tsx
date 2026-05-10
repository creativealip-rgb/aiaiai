"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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

const schema = z.object({
  name: z.string().trim().min(2, { message: "Nama minimal 2 karakter." }).max(100),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[+0-9 \-()]{6,20}$/.test(v), {
      message: "Nomor telepon tidak valid.",
    }),
});
type Values = z.infer<typeof schema>;

type ProfileInitial = { name: string; phone: string; email: string };

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial.name, phone: initial.phone },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const { error } = await authClient.updateUser({
      name: values.name,
      phone: values.phone?.length ? values.phone : undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Gagal menyimpan perubahan.");
      return;
    }
    toast.success("Profil diperbarui.");
    // Refresh Server Components so the header / dashboard pick up the new name.
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" value={initial.email} readOnly disabled />
          </FormControl>
          <FormDescription>Perubahan email belum tersedia di Fase 1.</FormDescription>
        </FormItem>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor WhatsApp</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+62812…"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </form>
    </Form>
  );
}
