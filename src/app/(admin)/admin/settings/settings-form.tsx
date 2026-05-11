"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { whatsappSettingSchema, type WhatsappSettingInput } from "@/lib/schemas/settings";
import { updateWhatsappFloatSettingAction } from "@/server/actions/admin/settings";

export function SettingsForm({
  initialPhone,
  initialMessage,
}: {
  initialPhone: string;
  initialMessage: string;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<WhatsappSettingInput>({
    resolver: zodResolver(whatsappSettingSchema),
    defaultValues: {
      phone: initialPhone,
      message: initialMessage,
    },
  });

  function onSubmit(values: WhatsappSettingInput) {
    startTransition(async () => {
      const res = await updateWhatsappFloatSettingAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pengaturan WhatsApp berhasil disimpan.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Float</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor WhatsApp</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="6281234567890" />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Gunakan format internasional, contoh: 6281234567890.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pesan default (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Halo admin, saya mau tanya..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan pengaturan"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

