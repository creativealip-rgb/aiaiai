import { z } from "zod";

export const voucherFormSchema = z.object({
  code: z.string().trim().min(3).max(32),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive(),
  minSpend: z.coerce.number().min(0).default(0),
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.coerce.number().int().positive().default(1),
  startsAt: z.string().trim().optional(),
  expiresAt: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export type VoucherFormInput = z.infer<typeof voucherFormSchema>;

