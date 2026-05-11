"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  orderNumber: z.string().trim().min(3, "Nomor order wajib diisi."),
  email: z.string().trim().email("Email tidak valid."),
});

type FormValues = z.infer<typeof schema>;

export function OrderAccessRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { orderNumber: "", email: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await fetch("/api/order/access-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    setSubmitting(false);

    if (!res.ok) {
      toast.error(body.error ?? "Gagal mengirim permintaan.");
      return;
    }

    toast.success(body.message ?? "Permintaan diproses.");
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minta ulang link akses order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor order</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="AI3-2026-0001" />
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
                  <FormLabel>Email checkout</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="you@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Mengirim..." : "Kirim ulang link"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

