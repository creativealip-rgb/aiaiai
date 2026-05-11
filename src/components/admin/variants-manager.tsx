"use client";

/**
 * Variants manager for the admin product-edit page.
 *
 * - Lists all variants of a product with inline actions.
 * - "Tambah" / "Edit" open a dialog with a react-hook-form + Zod form.
 * - Mutations call Server Actions; success triggers `router.refresh()`.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ProductVariant } from "@/db/schema";
import {
  createVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from "@/server/actions/admin/products";
import { variantCreateSchema } from "@/lib/schemas/products";
import { formatIdr } from "@/lib/price";

type FormValues = z.input<typeof variantCreateSchema>;

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; variant: ProductVariant };

const EMPTY_VALUES: FormValues = {
  name: "",
  sku: "",
  price: 0,
  stockMode: "tracked",
  description: "",
  sortOrder: 0,
  isActive: true,
};

export function VariantsManager({
  productId,
  variants,
  canDelete,
}: {
  productId: string;
  variants: ProductVariant[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [deleting, startDelete] = useTransition();

  function handleDelete(variant: ProductVariant) {
    if (!canDelete) {
      toast.error("Produk harus punya minimal 1 varian — tambah dulu sebelum menghapus.");
      return;
    }
    if (!window.confirm(`Hapus varian "${variant.name}" (${variant.sku})?`)) return;
    startDelete(async () => {
      const res = await deleteVariantAction(productId, variant.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Varian dihapus.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Varian</h2>
          <p className="text-muted-foreground text-sm">
            {variants.length} varian. SKU harus unik antar semua produk.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setDialog({ mode: "create" })}>
          <PlusIcon /> Tambah
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">Belum ada varian.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama / SKU</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell>
                  <div className="font-medium">{variant.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">{variant.sku}</div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatIdr(variant.price)}
                </TableCell>
                <TableCell className="text-xs">
                  {variant.stockMode === "tracked" ? (
                    <Badge variant="outline">tracked</Badge>
                  ) : (
                    <Badge>unlimited</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {variant.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                      aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline">nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDialog({ mode: "edit", variant })}
                      aria-label={`Edit varian ${variant.name}`}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={deleting}
                      onClick={() => handleDelete(variant)}
                      aria-label={`Hapus varian ${variant.name}`}
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <VariantDialog
        productId={productId}
        state={dialog}
        onOpenChange={(open) => {
          if (!open) setDialog({ mode: "closed" });
        }}
        onSuccess={() => {
          setDialog({ mode: "closed" });
          router.refresh();
        }}
      />
    </div>
  );
}

function VariantDialog({
  productId,
  state,
  onOpenChange,
  onSuccess,
}: {
  productId: string;
  state: DialogState;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isOpen = state.mode !== "closed";
  const isEdit = state.mode === "edit";

  const form = useForm<FormValues>({
    resolver: zodResolver(variantCreateSchema),
    values:
      state.mode === "edit"
        ? {
            name: state.variant.name,
            sku: state.variant.sku,
            price: Number(state.variant.price),
            stockMode: state.variant.stockMode,
            description: state.variant.description ?? "",
            sortOrder: state.variant.sortOrder,
            isActive: state.variant.isActive,
          }
        : EMPTY_VALUES,
  });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res =
      state.mode === "edit"
        ? await updateVariantAction(productId, { ...values, id: state.variant.id })
        : await createVariantAction(productId, values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) {
        for (const [field, errs] of Object.entries(res.fieldErrors)) {
          if (errs && errs[0]) {
            form.setError(field as keyof FormValues, { message: errs[0] });
          }
        }
      }
      return;
    }
    toast.success(isEdit ? "Varian diperbarui." : "Varian ditambahkan.");
    onSuccess();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit varian" : "Tambah varian"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah detail varian. SKU boleh diubah — pastikan tidak bentrok dengan varian lain."
              : "Tambah varian baru untuk produk ini."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="mis. 1 Bulan — Private" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="mis. NFX-P-1M-PRV" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga (IDR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode stok</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? "tracked"}
                        onValueChange={(v) => field.onChange(v as "tracked" | "unlimited")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tracked">Tracked</SelectItem>
                          <SelectItem value="unlimited">Unlimited</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urutan</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-end gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Aktif</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : isEdit ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
