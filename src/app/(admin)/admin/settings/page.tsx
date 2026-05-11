import type { Metadata } from "next";

import { getWhatsappFloatSetting } from "@/server/services/site-settings";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Admin · Settings",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const whatsapp = await getWhatsappFloatSetting();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Atur konfigurasi publik marketplace.
        </p>
      </div>
      <SettingsForm
        initialPhone={whatsapp?.phone ?? ""}
        initialMessage={whatsapp?.message ?? "Halo, saya ingin tanya tentang produk AI3."}
      />
    </div>
  );
}

