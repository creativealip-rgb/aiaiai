"use client";

/**
 * Client-side manager for the admin categories list.
 *
 * - Table of categories with inline actions.
 * - "Tambah" / "Edit" open a controlled dialog hosting a react-hook-form.
 * - Submit calls the Server Action; success triggers `router.refresh()`.
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/server/actions/admin/categories";
import type { CategoryWithCount } from "@/server/queries/categories";
import { categoryCreateSchema } from "@/lib/schemas/categories";

type FormValues = z.infer<typeof categoryCreateSchema>;

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; category: CategoryWithCount };

export function CategoriesManager({
  initialCategories,
}: {
  initialCategories: CategoryWithCount[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [deletePending, startDelete] = useTransition();

  function handleDelete(id: string, name: string, productCount: number) {
    if (productCount > 0) {
      toast.error(`Tidak bisa hapus — masih ada ${productCount} produk di kategori ini.`);
      return;
    }
    if (!window.confirm(`Hapus kategori "${name}"? Tindakan ini permanen.`)) return;
    startDelete(async () => {
      const res = await deleteCategoryAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Kategori dihapus.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setDialog({ mode: "create" })}>
          <PlusIcon /> Tambah kategori
        </Button>
      </div>

      {initialCategories.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada kategori. Klik &ldquo;Tambah kategori&rdquo; untuk membuat.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nama / slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Produk</TableHead>
              <TableHead className="text-right">Urutan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">/{category.slug}</div>
                  {category.description ? (
                    <div className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                      {category.description}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {category.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                      aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline">nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {category.productCount}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{category.sortOrder}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDialog({ mode: "edit", category })}
                      aria-label={`Edit ${category.name}`}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={deletePending}
                      onClick={() =>
                        handleDelete(category.id, category.name, category.productCount)
                      }
                      aria-label={`Hapus ${category.name}`}
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

      <CategoryDialog
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

function CategoryDialog({
  state,
  onOpenChange,
  onSuccess,
}: {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isOpen = state.mode !== "closed";
  const isEdit = state.mode === "edit";

  const form = useForm<FormValues>({
    resolver: zodResolver(categoryCreateSchema),
    values:
      state.mode === "edit"
        ? {
            name: state.category.name,
            slug: state.category.slug,
            icon: state.category.icon ?? "",
            description: state.category.description ?? "",
            sortOrder: state.category.sortOrder,
            isActive: state.category.isActive,
          }
        : {
            name: "",
            slug: "",
            icon: "",
            description: "",
            sortOrder: 0,
            isActive: true,
          },
  });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const payload = state.mode === "edit" ? { ...values, id: state.category.id } : values;
    const res =
      state.mode === "edit"
        ? await updateCategoryAction(payload)
        : await createCategoryAction(payload);
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
    toast.success(isEdit ? "Kategori diperbarui." : "Kategori ditambahkan.");
    onSuccess();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit kategori" : "Tambah kategori"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah detail kategori. Kosongkan slug untuk auto-generate dari nama."
              : "Buat kategori baru. Slug dibuat otomatis dari nama bila kosong."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mis. Hiburan" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="auto-generate bila kosong"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>Huruf kecil, angka, dan tanda &lsquo;-&rsquo;.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (opsional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="nama ikon Lucide, mis. sparkles"
                    />
                  </FormControl>
                  <FormDescription>
                    Lihat daftar ikon di{" "}
                    <a
                      href="https://lucide.dev/icons/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      lucide.dev
                    </a>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
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
                        max={999}
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
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Aktif</FormLabel>
                  </FormItem>
                )}
              />
            </div>

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
