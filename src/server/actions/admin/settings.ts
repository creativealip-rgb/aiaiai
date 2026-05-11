"use server";

import { revalidatePath } from "next/cache";

import { whatsappSettingSchema } from "@/lib/schemas/settings";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import { recordAdminAction } from "@/server/services/admin-audit";
import { normalizeWhatsappPhone, upsertWhatsappFloatSetting } from "@/server/services/site-settings";

export async function updateWhatsappFloatSettingAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = whatsappSettingSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data pengaturan tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const phone = normalizeWhatsappPhone(parsed.data.phone ?? "");
  const message = (parsed.data.message ?? "").trim();

  if (!phone) {
    return actionError("Nomor WhatsApp wajib diisi.");
  }
  if (phone.length < 9 || phone.length > 20) {
    return actionError("Nomor WhatsApp tidak valid.");
  }

  try {
    await upsertWhatsappFloatSetting({ phone, message });
    try {
      await recordAdminAction({
        actorId: admin.id,
        action: "settings.whatsapp.update",
        entityType: "site_settings",
        entityId: "whatsapp_float",
        diff: { phone, message },
      });
    } catch (error) {
      console.error("[updateWhatsappFloatSettingAction] audit log failed", error);
    }
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin/settings");
    return actionOk(undefined);
  } catch (error) {
    console.error("[updateWhatsappFloatSettingAction]", error);
    return actionError("Gagal menyimpan pengaturan WhatsApp.");
  }
}
