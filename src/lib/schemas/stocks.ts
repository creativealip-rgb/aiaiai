import { z } from "zod";

export const stockCreateSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  credentialText: z.string().trim().min(3, "Credential wajib diisi."),
});

export const stockStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["available", "reserved", "sold", "disabled"]),
});

export const stockBulkImportSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  csvText: z.string().trim().min(3),
});

export type StockCreateInput = z.infer<typeof stockCreateSchema>;
export type StockStatusUpdateInput = z.infer<typeof stockStatusUpdateSchema>;
export type StockBulkImportInput = z.infer<typeof stockBulkImportSchema>;

