import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export const WHATSAPP_FLOAT_SETTING_KEY = "whatsapp_float";

export type WhatsappFloatSetting = {
  phone: string;
  message: string;
};

export function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function buildWhatsappUrl(phone: string, message = ""): string {
  const normalized = normalizeWhatsappPhone(phone);
  const base = `https://wa.me/${normalized}`;
  const text = message.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export async function getWhatsappFloatSetting(): Promise<WhatsappFloatSetting | null> {
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, WHATSAPP_FLOAT_SETTING_KEY))
    .limit(1);

  if (!row?.value) return null;
  const phone = normalizeWhatsappPhone(String(row.value.phone ?? "").trim());
  if (!phone) return null;

  return {
    phone,
    message: String(row.value.message ?? "").trim(),
  };
}

export async function upsertWhatsappFloatSetting(input: {
  phone: string;
  message?: string;
}): Promise<void> {
  const phone = normalizeWhatsappPhone(input.phone);
  const message = (input.message ?? "").trim();
  const now = new Date();

  await db
    .insert(siteSettings)
    .values({
      key: WHATSAPP_FLOAT_SETTING_KEY,
      value: { phone, message },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: { phone, message },
        updatedAt: now,
      },
    });
}
