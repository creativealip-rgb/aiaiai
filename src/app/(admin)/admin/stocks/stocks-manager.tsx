"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bulkImportStocksAction,
  createStockAction,
  deleteStockAction,
  updateStockStatusAction,
} from "@/server/actions/admin/stocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccountStockStatus } from "@/db/schema";

type StockRow = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  label: string | null;
  notes: string | null;
  status: AccountStockStatus;
  soldToOrderItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type VariantOption = {
  id: string;
  name: string;
  sku: string;
  productId: string;
  productName: string;
};

const STATUS_OPTIONS: AccountStockStatus[] = ["available", "reserved", "sold", "disabled"];

export function StocksManager({
  initialStocks,
  variants,
}: {
  initialStocks: StockRow[];
  variants: VariantOption[];
}) {
  const [stocks, setStocks] = useState(initialStocks);
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [credentialText, setCredentialText] = useState("");
  const [csvText, setCsvText] = useState("email,password,profile,notes");
  const [isPending, startTransition] = useTransition();

  const selectedVariant = useMemo(
    () => variants.find((item) => item.id === variantId) ?? null,
    [variants, variantId],
  );

  function refreshPage() {
    window.location.reload();
  }

  function handleCreateSingle() {
    if (!selectedVariant) {
      toast.error("Pilih varian dulu.");
      return;
    }
    startTransition(async () => {
      const res = await createStockAction({
        productId: selectedVariant.productId,
        variantId: selectedVariant.id,
        label,
        notes,
        credentialText,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Stok berhasil ditambahkan.");
      setLabel("");
      setNotes("");
      setCredentialText("");
      refreshPage();
    });
  }

  function handleBulkImport() {
    if (!selectedVariant) {
      toast.error("Pilih varian dulu.");
      return;
    }
    startTransition(async () => {
      const res = await bulkImportStocksAction({
        productId: selectedVariant.productId,
        variantId: selectedVariant.id,
        csvText,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data.inserted} stok berhasil diimport.`);
      refreshPage();
    });
  }

  function handleStatusChange(id: string, status: AccountStockStatus) {
    startTransition(async () => {
      const res = await updateStockStatusAction({ id, status });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStocks((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      toast.success("Status stok diperbarui.");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteStockAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStocks((prev) => prev.filter((row) => row.id !== id));
      toast.success("Stok dihapus.");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah stok akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Varian tracked</Label>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
            >
              {variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productName} · {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Catatan internal</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Credential (plain text / JSON)</Label>
            <Textarea
              rows={3}
              value={credentialText}
              onChange={(e) => setCredentialText(e.target.value)}
              placeholder='contoh: {"email":"x@y.com","password":"abc"}'
            />
          </div>

          <Button disabled={isPending} onClick={handleCreateSingle}>
            Tambah 1 stok
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk import CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="email,password,profile,notes"
          />
          <Button disabled={isPending} onClick={handleBulkImport}>
            Import CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar stok</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stocks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada stok.</p>
          ) : (
            stocks.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {row.productName} · {row.variantName}
                  </div>
                  <div className="text-muted-foreground text-xs">{row.sku}</div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{row.status}</Badge>
                    {row.label ? <Badge variant="secondary">{row.label}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.status}
                    onChange={(e) => handleStatusChange(row.id, e.target.value as AccountStockStatus)}
                    className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(row.id)}
                    disabled={row.status === "sold"}
                  >
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
