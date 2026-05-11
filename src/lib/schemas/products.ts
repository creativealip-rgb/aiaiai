/**
 * Zod schemas for product + variant CRUD — safe to import from both server
 * and client code. The service layer (server-only) re-exports these alongside
 * its mutation functions.
 */

import { z } from "zod";

const priceField = z.number().min(0, "Harga harus ≥ 0.").max(99_999_999_999);
const optionalPriceField = z
  .union([z.number().min(0).max(99_999_999_999), z.null()])
  .optional();

// Form UI always supplies every field; `z.number()` / `z.boolean()` (not
// `z.coerce.*`) keep `z.input === z.output` so react-hook-form + zodResolver
// type-check cleanly.
export const variantCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama varian wajib diisi.").max(80),
  sku: z
    .string()
    .trim()
    .min(2, "SKU minimal 2 karakter.")
    .max(60)
    .regex(/^[A-Za-z0-9_-]+$/u, "SKU hanya boleh huruf, angka, '-' dan '_'."),
  price: priceField,
  stockMode: z.enum(["tracked", "unlimited"]),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const variantUpdateSchema = variantCreateSchema.extend({
  id: z.string().min(1),
});

export type VariantCreateInput = z.infer<typeof variantCreateSchema>;
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const productCoreSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Slug hanya boleh huruf kecil, angka, dan tanda '-'.")
    .optional()
    .or(z.literal("")),
  categoryId: z.string().min(1, "Kategori wajib dipilih."),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  type: z.enum(["account", "service"]),
  deliveryType: z.enum(["auto", "manual"]),
  basePrice: priceField,
  discountPrice: optionalPriceField,
  warrantyDays: z.number().int().min(0).max(3650),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  images: z.array(z.string().url()).max(10).optional(),
});

export const productCreateSchema = productCoreSchema.extend({
  variants: z.array(variantCreateSchema).min(1, "Produk harus punya minimal 1 varian."),
});

export const productUpdateSchema = productCoreSchema.extend({
  id: z.string().min(1),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
