import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth";

import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const hasPassword = true; // In Phase 1 we only show the change-password form.
  // Phase 3+ will conditionally hide this for OAuth-only accounts via
  // authClient.listAccounts().

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-muted-foreground text-sm">
          Ubah informasi dasar akun dan password Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi akun</CardTitle>
          <CardDescription>Nama &amp; nomor kontak.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              name: user.name ?? "",
              phone: user.phone ?? "",
              email: user.email,
            }}
          />
        </CardContent>
      </Card>

      {hasPassword ? (
        <Card>
          <CardHeader>
            <CardTitle>Ganti password</CardTitle>
            <CardDescription>
              Semua sesi lain akan keluar otomatis setelah password diubah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
