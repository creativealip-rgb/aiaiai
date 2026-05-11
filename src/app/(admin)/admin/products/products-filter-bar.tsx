"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProductsFilterInitial = {
  search: string;
  categoryId: string;
  type: string;
  includeDeleted: boolean;
};

export function ProductsFilterBar({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial: ProductsFilterInitial;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const sp = new URLSearchParams();
    const search = String(formData.get("search") ?? "").trim();
    const categoryId = String(formData.get("categoryId") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const includeDeleted = formData.get("includeDeleted") === "on";

    if (search) sp.set("search", search);
    if (categoryId && categoryId !== "all") sp.set("categoryId", categoryId);
    if (type && type !== "all") sp.set("type", type);
    if (includeDeleted) sp.set("includeDeleted", "1");

    const query = sp.toString();
    startTransition(() => {
      router.push(query ? `/admin/products?${query}` : "/admin/products");
    });
  }

  function reset() {
    startTransition(() => {
      router.push("/admin/products");
    });
  }

  // Remount when the URL changes so the uncontrolled inputs sync with state.
  const key = searchParams.toString();

  return (
    <form
      key={key}
      action={submit}
      className="bg-muted/30 grid gap-3 rounded-lg border p-3 md:grid-cols-[1.5fr_1fr_1fr_auto_auto]"
    >
      <Input
        name="search"
        placeholder="Cari nama / slug…"
        defaultValue={initial.search}
        aria-label="Cari produk"
      />
      <Select name="categoryId" defaultValue={initial.categoryId || "all"}>
        <SelectTrigger aria-label="Filter kategori" className="w-full">
          <SelectValue placeholder="Kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua kategori</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select name="type" defaultValue={initial.type || "all"}>
        <SelectTrigger aria-label="Filter tipe" className="w-full">
          <SelectValue placeholder="Tipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua tipe</SelectItem>
          <SelectItem value="account">Akun</SelectItem>
          <SelectItem value="service">Jasa</SelectItem>
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="includeDeleted"
          defaultChecked={initial.includeDeleted}
          // Checkbox forwards its checked state to the form via name,
          // but Base UI does not auto-serialise. We use a hidden input instead.
        />
        <span>Tampilkan yang dihapus</span>
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Memuat…" : "Filter"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset} disabled={pending}>
          Reset
        </Button>
      </div>
    </form>
  );
}
