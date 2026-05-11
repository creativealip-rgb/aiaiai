"use client";

/**
 * Shared create/edit form for admin product CRUD.
 *
 * - Create mode: mounts a `variants` field-array (≥ 1 required).
 * - Edit mode: variants are managed in a separate `VariantsManager`
 *   component so the user can add/remove one at a time without blocking
 *   core field edits.
 *
 * Validation is Zod-first (the server re-validates on submit), powered by
 * react-hook-form. The form sends already-typed payloads (numbers, booleans)
 * straight to the action.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/db/schema";
import type { ProductDetail } from "@/server/queries/products";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/admin/products";
import { productCoreSchema, variantCreateSchema } from "@/lib/schemas/products";

const createFormSchema = productCoreSchema.extend({
  variants: z.array(variantCreateSchema).min(1, "Produk harus punya minimal 1 varian."),
});

type CreateFormValues = z.input<typeof createFormSchema>;
type EditFormValues = z.input<typeof productCoreSchema>;

function emptyVariant(sortOrder: number): z.input<typeof variantCreateSchema> {
  return {
    name: "",
    sku: "",
    price: 0,
    stockMode: "tracked",
    description: "",
    sortOrder,
    isActive: true,
  };
}

const DEFAULT_CREATE_VALUES: CreateFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  type: "account",
  deliveryType: "auto",
  basePrice: 0,
  discountPrice: null,
  warrantyDays: 30,
  isActive: true,
  isFeatured: false,
  thumbnailUrl: "",
  images: [],
  variants: [emptyVariant(10)],
};

type ProductFormProps = {
  mode: "create" | "edit";
  categories: Pick<Category, "id" | "name" | "slug">[];
  product?: ProductDetail;
};

export function ProductForm({ mode, categories, product }: ProductFormProps) {
  if (mode === "create") {
    return <CreateForm categories={categories} />;
  }
  if (!product) {
    throw new Error("ProductForm: `product` is required in edit mode.");
  }
  return <EditForm categories={categories} product={product} />;
}

function CreateForm({ categories }: { categories: ProductFormProps["categories"] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: DEFAULT_CREATE_VALUES,
  });

  const variants = useFieldArray({ control: form.control, name: "variants" });

  async function onSubmit(values: CreateFormValues) {
    setSubmitting(true);
    const res = await createProductAction(values);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) applyFieldErrors(form, res.fieldErrors);
      return;
    }
    toast.success("Produk dibuat.");
    router.push(`/admin/products/${res.data.id}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <CoreFields form={form} categories={categories} />
        <ImagesField form={form} />

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Varian</h2>
              <p className="text-muted-foreground text-sm">
                Tambahkan minimal 1 varian. Tiap varian punya SKU & harga sendiri.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => variants.append(emptyVariant((variants.fields.length + 1) * 10))}
            >
              <PlusIcon /> Tambah varian
            </Button>
          </div>

          <ul className="space-y-4">
            {variants.fields.map((field, index) => (
              <li
                key={field.id}
                className="bg-muted/30 relative space-y-4 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Varian #{index + 1}</div>
                  {variants.fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => variants.remove(index)}
                      aria-label={`Hapus varian ${index + 1}`}
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.name` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama varian</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="mis. 1 Bulan — Private" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.sku` as const}
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
                    name={`variants.${index}.price` as const}
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
                    name={`variants.${index}.stockMode` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mode stok</FormLabel>
                        <FormControl>
                          <StockModeSelect value={field.value ?? "tracked"} onValueChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.sortOrder` as const}
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
                    name={`variants.${index}.isActive` as const}
                    render={({ field }) => (
                      <FormItem className="flex items-end gap-2 pb-2">
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
                  name={`variants.${index}.description` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi varian (opsional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </li>
            ))}
          </ul>
        </section>

        <FormFooter submitting={submitting} label="Buat produk" />
      </form>
    </Form>
  );
}

function EditForm({
  categories,
  product,
}: {
  categories: ProductFormProps["categories"];
  product: ProductDetail;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(productCoreSchema),
    defaultValues: {
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      description: product.description ?? "",
      type: product.type,
      deliveryType: product.deliveryType,
      basePrice: Number(product.basePrice),
      discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
      warrantyDays: product.warrantyDays,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      thumbnailUrl: product.thumbnailUrl ?? "",
      images: product.images ?? [],
    },
  });

  async function onSubmit(values: EditFormValues) {
    setSubmitting(true);
    const res = await updateProductAction({ ...values, id: product.id });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) applyFieldErrors(form, res.fieldErrors);
      return;
    }
    toast.success("Produk diperbarui.");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <CoreFields form={form} categories={categories} />
        <ImagesField form={form} />
        <FormFooter submitting={submitting} label="Simpan perubahan" />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

// `CoreFields` / `ImagesField` are used by both the create and edit forms.
// Their schemas differ (only create has the `variants` field array). We
// intentionally opt out of the strict generic typing here — the inner fields
// we reference exist on both schemas, and react-hook-form's `Control` type
// uses invariant positions that make a shared union untenable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharedForm = any;

function CoreFields({
  form,
  categories,
}: {
  form: SharedForm;
  categories: ProductFormProps["categories"];
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"name" as any}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Nama produk</FormLabel>
            <FormControl>
              <Input {...field} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"slug" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="auto bila kosong"
                autoComplete="off"
              />
            </FormControl>
            <FormDescription>Dipakai di URL katalog.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"categoryId" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kategori</FormLabel>
            <FormControl>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"type" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipe</FormLabel>
            <FormControl>
              <Select value={field.value ?? "account"} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">Akun digital</SelectItem>
                  <SelectItem value="service">Jasa</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"deliveryType" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pengiriman</FormLabel>
            <FormControl>
              <Select value={field.value ?? "auto"} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Otomatis (dari stok akun)</SelectItem>
                  <SelectItem value="manual">Manual (admin deliver)</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"basePrice" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Harga dasar (IDR)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                value={field.value ?? 0}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormDescription>Harga default bila varian tidak override.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"discountPrice" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Harga diskon (opsional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                value={field.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
              />
            </FormControl>
            <FormDescription>Kosongkan bila tidak ada diskon.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"warrantyDays" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Garansi (hari)</FormLabel>
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"description" as any}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Deskripsi (Markdown)</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={8} className="font-mono text-sm" />
            </FormControl>
            <FormDescription>
              Markdown didukung. Gunakan untuk menjelaskan fitur, ketentuan, dan FAQ.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"isActive" as any}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={!!field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="cursor-pointer">Aktif — tampil di katalog publik</FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={"isFeatured" as any}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={!!field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="cursor-pointer">Unggulan — tampil di beranda</FormLabel>
          </FormItem>
        )}
      />
    </section>
  );
}

function ImagesField({ form }: { form: SharedForm }) {
  return (
    <FormField
      control={form.control}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name={"images" as any}
      render={({ field }) => {
        const images = (field.value as string[] | undefined) ?? [];
        return (
          <FormItem>
            <FormLabel>Gambar produk</FormLabel>
            <FormDescription>
              Gambar pertama akan dijadikan thumbnail. Maksimal 6 gambar.
            </FormDescription>
            <FormControl>
              <ImageUploader
                value={images}
                onChange={(next) => {
                  field.onChange(next);
                  // Keep `thumbnailUrl` in sync with the first image.
                  form.setValue(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    "thumbnailUrl" as any,
                    next[0] ?? "",
                    { shouldDirty: true },
                  );
                }}
                folder="products"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function StockModeSelect({
  value,
  onValueChange,
}: {
  value: "tracked" | "unlimited";
  onValueChange: (v: "tracked" | "unlimited") => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as "tracked" | "unlimited")}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tracked">Tracked (stok kredensial)</SelectItem>
        <SelectItem value="unlimited">Unlimited</SelectItem>
      </SelectContent>
    </Select>
  );
}

function FormFooter({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : label}
      </Button>
    </div>
  );
}

function applyFieldErrors(form: SharedForm, fieldErrors: Record<string, string[]>) {
  for (const [field, errs] of Object.entries(fieldErrors)) {
    if (errs && errs[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setError(field as any, { message: errs[0] });
    }
  }
}
