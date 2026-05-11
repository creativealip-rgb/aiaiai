"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatIdr } from "@/lib/price";
import { checkoutAction } from "@/server/actions/checkout";
import { useCartStore } from "@/stores/cart";

const checkoutFormSchema = z.object({
  guestEmail: z.string().email("Email tidak valid."),
  guestName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  guestPhone: z.string().trim().min(8, "Nomor HP minimal 8 digit.").max(20),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  voucherCode: z.string().trim().max(32).optional().or(z.literal("")),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

type CheckoutUser = {
  email: string;
  name: string;
  phone: string;
  balance: number;
} | null;

type PaymentChoice = "mayar" | "wallet";

export function CheckoutForm({ user }: { user: CheckoutUser }) {
  const isLoggedIn = !!user;
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("mayar");

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      guestEmail: user?.email ?? "",
      guestName: user?.name ?? "",
      guestPhone: user?.phone ?? "",
      notes: "",
      voucherCode: "",
    },
  });

  useEffect(() => {
    form.reset({
      guestEmail: user?.email ?? "",
      guestName: user?.name ?? "",
      guestPhone: user?.phone ?? "",
      notes: "",
      voucherCode: "",
    });
  }, [form, user]);

  const total = getTotal();
  const canUseWallet = !!user && user.balance > 0;

  const walletUsedPreview = useMemo(() => {
    if (!isLoggedIn || paymentChoice !== "wallet") return 0;
    return Math.min(total, user?.balance ?? 0);
  }, [isLoggedIn, paymentChoice, total, user?.balance]);

  const payableNow = Math.max(0, total - walletUsedPreview);

  async function onSubmit(values: CheckoutFormValues) {
    if (items.length === 0) {
      toast.error("Keranjang kosong.");
      return;
    }

    if (!isLoggedIn && paymentChoice !== "mayar") {
      toast.error("Guest checkout hanya mendukung pembayaran via Mayar.");
      return;
    }

    setSubmitting(true);

    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        qty: i.qty,
      })),
      guestEmail: isLoggedIn ? (user?.email ?? values.guestEmail) : values.guestEmail,
      guestName: values.guestName,
      guestPhone: values.guestPhone,
      notes: values.notes ?? "",
      voucherCode: values.voucherCode ?? "",
      useBalance: isLoggedIn && paymentChoice === "wallet",
      paymentMethod: paymentChoice,
    } as const;

    const res = await checkoutAction(payload);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      if (res.code === "EMAIL_CLAIMED") {
        router.push(`/login?next=/checkout`);
      }
      return;
    }

    clearCart();

    if (res.data.paymentUrl) {
      window.location.assign(res.data.paymentUrl);
      return;
    }

    toast.success("Order berhasil dibuat.");
    router.push(`/order/${res.data.orderNumber}`);
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Keranjang kosong. Tambahkan produk dulu.</p>
        <Button nativeButton={false} render={<Link href="/products">Jelajahi produk</Link>} />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isLoggedIn ? "Informasi member" : "Informasi pembeli"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="guestEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="you@example.com"
                        readOnly={isLoggedIn}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama lengkap</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. HP / WhatsApp</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="08xxxxxxxxxx" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan (opsional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="voucherCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode voucher (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="HEMAT10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {isLoggedIn ? (
            <Card>
              <CardHeader>
                <CardTitle>Metode pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="border-border flex items-center gap-3 rounded-md border p-3">
                  <input
                    type="radio"
                    name="payment-method"
                    value="mayar"
                    checked={paymentChoice === "mayar"}
                    onChange={() => setPaymentChoice("mayar")}
                  />
                  <span>Mayar (QRIS / VA / e-wallet)</span>
                </label>

                {canUseWallet ? (
                  <label
                    className="border-border flex items-center gap-3 rounded-md border p-3"
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value="wallet"
                      checked={paymentChoice === "wallet"}
                      onChange={() => setPaymentChoice("wallet")}
                    />
                    <span>
                      Saldo AI3 ({formatIdr(user?.balance ?? 0)})
                      {user && user.balance < total
                        ? " — akan dipakai parsial, sisanya via Mayar"
                        : ""}
                    </span>
                  </label>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y text-sm">
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.variantId}`}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.productName}</div>
                      <div className="text-muted-foreground text-xs">
                        {item.variantName} × {item.qty}
                      </div>
                    </div>
                    <div className="shrink-0 tabular-nums">{formatIdr(item.price * item.qty)}</div>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatIdr(total)}</span>
                </div>
                {walletUsedPreview > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Dipotong saldo</span>
                    <span className="tabular-nums">-{formatIdr(walletUsedPreview)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Dibayar sekarang</span>
                  <span className="tabular-nums">{formatIdr(payableNow)}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={submitting} type="submit">
                {submitting
                  ? "Memproses…"
                  : payableNow === 0
                    ? "Bayar dengan saldo"
                    : "Bayar sekarang"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </Form>
  );
}
