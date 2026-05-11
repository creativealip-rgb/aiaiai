import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { vouchers, type VoucherType } from "@/db/schema";

export class VoucherValidationError extends Error {
  readonly code: string;
  constructor(message: string, code = "VOUCHER_VALIDATION_ERROR") {
    super(message);
    this.name = "VoucherValidationError";
    this.code = code;
  }
}

export type VoucherInput = {
  code: string;
  type: VoucherType;
  value: number;
  minSpend: number;
  maxUses?: number | null;
  maxUsesPerUser: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
};

export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase();
}

function parseOptionalDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new VoucherValidationError("Format tanggal tidak valid.");
  return d;
}

function ensureVoucherInput(input: VoucherInput): void {
  if (!input.code.trim()) throw new VoucherValidationError("Kode voucher wajib diisi.");
  if (input.value <= 0) throw new VoucherValidationError("Nilai voucher harus lebih dari 0.");
  if (input.type === "percent" && input.value > 100) {
    throw new VoucherValidationError("Voucher persen maksimal 100.");
  }
  if (input.minSpend < 0) throw new VoucherValidationError("Minimum belanja tidak valid.");
  if (input.maxUsesPerUser < 1) throw new VoucherValidationError("Maksimal penggunaan per user minimal 1.");
  if (input.maxUses !== null && input.maxUses !== undefined && input.maxUses < 1) {
    throw new VoucherValidationError("Maksimal penggunaan total minimal 1.");
  }
}

export async function listVouchers() {
  return db.select().from(vouchers).orderBy(desc(vouchers.createdAt), asc(vouchers.code));
}

export async function createVoucher(input: VoucherInput) {
  ensureVoucherInput(input);
  const code = normalizeVoucherCode(input.code);

  const [exists] = await db.select({ id: vouchers.id }).from(vouchers).where(eq(vouchers.code, code)).limit(1);
  if (exists) throw new VoucherValidationError("Kode voucher sudah digunakan.", "CODE_EXISTS");

  const startsAt = parseOptionalDate(input.startsAt);
  const expiresAt = parseOptionalDate(input.expiresAt);

  const [row] = await db
    .insert(vouchers)
    .values({
      code,
      type: input.type,
      value: input.value.toString(),
      minSpend: input.minSpend.toString(),
      maxUses: input.maxUses ?? null,
      maxUsesPerUser: input.maxUsesPerUser,
      startsAt,
      expiresAt,
      isActive: input.isActive,
    })
    .returning();

  if (!row) throw new Error("Gagal membuat voucher.");
  return row;
}

export async function updateVoucher(id: string, input: VoucherInput) {
  ensureVoucherInput(input);
  if (!id) throw new VoucherValidationError("ID voucher tidak valid.");
  const code = normalizeVoucherCode(input.code);

  const [exists] = await db
    .select({ id: vouchers.id })
    .from(vouchers)
    .where(and(eq(vouchers.code, code)))
    .limit(1);
  if (exists && exists.id !== id) {
    throw new VoucherValidationError("Kode voucher sudah digunakan.", "CODE_EXISTS");
  }

  const startsAt = parseOptionalDate(input.startsAt);
  const expiresAt = parseOptionalDate(input.expiresAt);

  const [row] = await db
    .update(vouchers)
    .set({
      code,
      type: input.type,
      value: input.value.toString(),
      minSpend: input.minSpend.toString(),
      maxUses: input.maxUses ?? null,
      maxUsesPerUser: input.maxUsesPerUser,
      startsAt,
      expiresAt,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(vouchers.id, id))
    .returning();

  if (!row) throw new VoucherValidationError("Voucher tidak ditemukan.", "NOT_FOUND");
  return row;
}

export async function deleteVoucher(id: string): Promise<void> {
  if (!id) throw new VoucherValidationError("ID voucher tidak valid.");
  await db.delete(vouchers).where(eq(vouchers.id, id));
}

