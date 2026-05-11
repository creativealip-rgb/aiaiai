/**
 * Zod schemas for checkout — safe to import from both server and client.
 */

import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(10),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Keranjang tidak boleh kosong."),
  // Guest fields (required when not logged in)
  guestEmail: z.string().email("Email tidak valid.").optional().or(z.literal("")),
  guestName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  guestPhone: z.string().trim().min(8).max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  voucherCode: z.string().trim().max(32).optional().or(z.literal("")),
  useBalance: z.boolean().default(false),
  paymentMethod: z.enum(["mayar", "wallet"]).default("mayar"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutItem = z.infer<typeof checkoutItemSchema>;
