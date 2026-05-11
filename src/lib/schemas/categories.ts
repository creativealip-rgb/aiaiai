/**
 * Zod schemas for category CRUD — safe to import from both server and client
 * code. The service layer (server-only) re-exports these alongside its
 * mutation functions.
 */

import { z } from "zod";

// Form UI always supplies every field; `z.number()` / `z.boolean()` (not
// `z.coerce.*`) keep `z.input === z.output` so react-hook-form + zodResolver
// type-check cleanly.
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Slug hanya boleh huruf kecil, angka, dan tanda '-'.")
    .optional()
    .or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const categoryUpdateSchema = categoryCreateSchema.extend({
  id: z.string().min(1),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
