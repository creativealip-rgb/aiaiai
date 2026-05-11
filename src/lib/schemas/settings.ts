import { z } from "zod";

export const whatsappSettingSchema = z.object({
  phone: z.string().trim().max(24).optional().or(z.literal("")),
  message: z.string().trim().max(280).optional().or(z.literal("")),
});

export type WhatsappSettingInput = z.infer<typeof whatsappSettingSchema>;

