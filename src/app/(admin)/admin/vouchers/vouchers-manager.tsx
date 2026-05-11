"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createVoucherAction,
  deleteVoucherAction,
  updateVoucherAction,
} from "@/server/actions/admin/vouchers";
import type { VoucherType } from "@/db/schema";

type VoucherRow = {
  id: string;
  code: string;
  type: VoucherType;
  value: string;
  minSpend: string;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

type VoucherFormState = {
  code: string;
  type: VoucherType;
  value: string;
  minSpend: string;
  maxUses: string;
  maxUsesPerUser: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const EMPTY_FORM: VoucherFormState = {
  code: "",
  type: "percent",
  value: "",
  minSpend: "0",
  maxUses: "",
  maxUsesPerUser: "1",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

export function VouchersManager({ initialVouchers }: { initialVouchers: VoucherRow[] }) {
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [form, setForm] = useState<VoucherFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitLabel = useMemo(() => (editingId ? "Update voucher" : "Buat voucher"), [editingId]);

  function setField<K extends keyof VoucherFormState>(key: K, value: VoucherFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function toPayload(state: VoucherFormState) {
    return {
      code: state.code,
      type: state.type,
      value: Number(state.value || "0"),
      minSpend: Number(state.minSpend || "0"),
      maxUses: state.maxUses ? Number(state.maxUses) : null,
      maxUsesPerUser: Number(state.maxUsesPerUser || "1"),
      startsAt: state.startsAt,
      expiresAt: state.expiresAt,
      isActive: state.isActive,
    };
  }

  function startEdit(row: VoucherRow) {
    setEditingId(row.id);
    setForm({
      code: row.code,
      type: row.type,
      value: row.value,
      minSpend: row.minSpend,
      maxUses: row.maxUses ? String(row.maxUses) : "",
      maxUsesPerUser: String(row.maxUsesPerUser),
      startsAt: row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString().slice(0, 16) : "",
      isActive: row.isActive,
    });
  }

  function submitForm() {
    startTransition(async () => {
      const payload = toPayload(form);
      const res = editingId
        ? await updateVoucherAction(editingId, payload)
        : await createVoucherAction(payload);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(editingId ? "Voucher diperbarui." : "Voucher dibuat.");
      window.location.reload();
    });
  }

  function removeVoucher(id: string) {
    if (!confirm("Hapus voucher ini?")) return;
    startTransition(async () => {
      const res = await deleteVoucherAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      toast.success("Voucher dihapus.");
      if (editingId === id) resetForm();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit voucher" : "Buat voucher"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Kode">
              <Input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="HEMAT10" />
            </Field>
            <Field label="Tipe">
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value as VoucherType)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </Field>
            <Field label="Nilai">
              <Input type="number" value={form.value} onChange={(e) => setField("value", e.target.value)} />
            </Field>
            <Field label="Min spend">
              <Input type="number" value={form.minSpend} onChange={(e) => setField("minSpend", e.target.value)} />
            </Field>
            <Field label="Max uses (opsional)">
              <Input type="number" value={form.maxUses} onChange={(e) => setField("maxUses", e.target.value)} />
            </Field>
            <Field label="Max uses / user">
              <Input type="number" value={form.maxUsesPerUser} onChange={(e) => setField("maxUsesPerUser", e.target.value)} />
            </Field>
            <Field label="Starts at (opsional)">
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setField("startsAt", e.target.value)} />
            </Field>
            <Field label="Expires at (opsional)">
              <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setField("expiresAt", e.target.value)} />
            </Field>
            <Field label="Status">
              <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                />
                <span>Aktif</span>
              </label>
            </Field>
          </div>
          <div className="flex gap-2">
            <Button disabled={pending} onClick={submitForm}>
              {submitLabel}
            </Button>
            {editingId ? (
              <Button variant="outline" disabled={pending} onClick={resetForm}>
                Batal
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar voucher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vouchers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada voucher.</p>
          ) : (
            vouchers.map((voucher) => (
              <div key={voucher.id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{voucher.code}</div>
                  <div className="text-muted-foreground text-xs">
                    {voucher.type} · value {voucher.value} · min {voucher.minSpend} · used {voucher.usedCount}
                    {voucher.maxUses ? ` / ${voucher.maxUses}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(voucher)} disabled={pending}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeVoucher(voucher.id)} disabled={pending}>
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
