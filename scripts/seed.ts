/**
 * Database seed — idempotent.
 *
 * - Admin user (credential + role=admin).
 * - 3 seed categories (Hiburan, AI, Produktifitas).
 * - Sample products + variants spread across the categories (IMPLEMENTATION_PLAN.md §21).
 *
 * Run with `npm run db:seed`. Every branch is keyed by a natural identifier
 * (slug / sku / email) so repeated runs don't duplicate rows.
 *
 * Env is loaded by tsx via --env-file in the npm script.
 */

import { eq, sql } from "drizzle-orm";

import { db } from "../src/db";
import {
  accounts,
  categories,
  productVariants,
  products,
  users,
  type Category,
} from "../src/db/schema";
import { env } from "../src/lib/env";
import { hashPassword } from "../src/lib/password";

async function seedAdmin() {
  const email = env.SEED_ADMIN_EMAIL.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  const now = new Date();
  const hash = await hashPassword(password);

  console.info(`[seed] Upserting admin user ${email} …`);

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;

  if (existing[0]) {
    userId = existing[0].id;
    await db
      .update(users)
      .set({
        name: existing[0].name || "AI3 Admin",
        role: "admin",
        emailVerified: true,
        claimedAt: existing[0].claimedAt ?? now,
        isBanned: false,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    console.info(`[seed] · Updated existing admin user (${userId}).`);
  } else {
    const [inserted] = await db
      .insert(users)
      .values({
        name: "AI3 Admin",
        email,
        emailVerified: true,
        role: "admin",
        claimedAt: now,
      })
      .returning({ id: users.id });
    if (!inserted) throw new Error("Failed to insert admin user");
    userId = inserted.id;
    console.info(`[seed] · Created admin user (${userId}).`);
  }

  const existingAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const credentialAcct = existingAccounts.find((a) => a.providerId === "credential");
  if (credentialAcct) {
    await db
      .update(accounts)
      .set({ password: hash, updatedAt: now })
      .where(eq(accounts.id, credentialAcct.id));
    console.info(`[seed] · Updated admin credential hash.`);
  } else {
    await db.insert(accounts).values({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
    console.info(`[seed] · Inserted admin credential account.`);
  }

  console.info(`[seed] Admin login: ${email} / ${password}`);
}

// ---------------------------------------------------------------------------
// Catalog seed
// ---------------------------------------------------------------------------

type SeedCategory = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  sortOrder: number;
};

type SeedVariant = {
  sku: string;
  name: string;
  price: number;
  description?: string;
  sortOrder?: number;
};

type SeedProduct = {
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  type: "account" | "service";
  deliveryType: "auto" | "manual";
  basePrice: number;
  discountPrice?: number;
  warrantyDays: number;
  isFeatured?: boolean;
  soldCount?: number;
  variants: SeedVariant[];
};

const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: "hiburan",
    name: "Hiburan",
    icon: "clapperboard",
    description: "Streaming film, musik, dan game — Netflix, Spotify, Disney+, dan lainnya.",
    sortOrder: 10,
  },
  {
    slug: "ai",
    name: "AI",
    icon: "sparkles",
    description: "Akun AI generatif untuk teks, gambar, dan kode — ChatGPT, Claude, Midjourney.",
    sortOrder: 20,
  },
  {
    slug: "produktifitas",
    name: "Produktifitas",
    icon: "briefcase",
    description: "Tools kerja & kreatif — Canva, Notion, Office 365, Google Workspace.",
    sortOrder: 30,
  },
];

const SEED_PRODUCTS: SeedProduct[] = [
  // Hiburan
  {
    slug: "netflix-premium",
    categorySlug: "hiburan",
    name: "Netflix Premium 4K",
    description:
      "## Netflix Premium 4K UHD\n\nNikmati film & series tanpa batas dengan kualitas 4K UHD.\n\n- **Resolusi:** hingga 4K Ultra HD + HDR.\n- **Perangkat:** bisa diputar di TV, laptop, tablet, HP.\n- **Garansi:** 30 hari penuh, gratis ganti kalau bermasalah.",
    type: "account",
    deliveryType: "auto",
    basePrice: 45000,
    discountPrice: 39000,
    warrantyDays: 30,
    isFeatured: true,
    soldCount: 128,
    variants: [
      { sku: "NFX-P-1M-SHR", name: "1 Bulan — Sharing 1 Profil", price: 39000, sortOrder: 10 },
      { sku: "NFX-P-1M-PRV", name: "1 Bulan — Private", price: 89000, sortOrder: 20 },
      { sku: "NFX-P-3M-PRV", name: "3 Bulan — Private", price: 249000, sortOrder: 30 },
    ],
  },
  {
    slug: "spotify-premium",
    categorySlug: "hiburan",
    name: "Spotify Premium",
    description:
      "Streaming musik tanpa iklan. Download untuk dengar offline. Cocok untuk semua perangkat.",
    type: "account",
    deliveryType: "auto",
    basePrice: 29000,
    warrantyDays: 30,
    isFeatured: true,
    soldCount: 210,
    variants: [
      { sku: "SPT-P-1M", name: "1 Bulan", price: 29000, sortOrder: 10 },
      { sku: "SPT-P-3M", name: "3 Bulan", price: 79000, sortOrder: 20 },
      { sku: "SPT-P-12M", name: "12 Bulan", price: 279000, sortOrder: 30 },
    ],
  },
  {
    slug: "disney-plus-hotstar",
    categorySlug: "hiburan",
    name: "Disney+ Hotstar",
    description: "Akses penuh Disney+, Marvel, Star Wars, Hotstar, dan konten eksklusif lainnya.",
    type: "account",
    deliveryType: "auto",
    basePrice: 55000,
    warrantyDays: 30,
    soldCount: 74,
    variants: [
      { sku: "DSN-P-1M", name: "1 Bulan", price: 55000, sortOrder: 10 },
      { sku: "DSN-P-3M", name: "3 Bulan", price: 149000, sortOrder: 20 },
    ],
  },
  {
    slug: "youtube-premium",
    categorySlug: "hiburan",
    name: "YouTube Premium",
    description: "YouTube tanpa iklan + YouTube Music Premium. Bisa download dan play background.",
    type: "account",
    deliveryType: "auto",
    basePrice: 35000,
    warrantyDays: 30,
    soldCount: 55,
    variants: [
      { sku: "YTP-P-1M", name: "1 Bulan", price: 35000, sortOrder: 10 },
      { sku: "YTP-P-3M", name: "3 Bulan", price: 95000, sortOrder: 20 },
    ],
  },

  // AI
  {
    slug: "chatgpt-plus",
    categorySlug: "ai",
    name: "ChatGPT Plus",
    description:
      "## ChatGPT Plus\n\nAkses model **GPT-5 / GPT-4.1** dengan prioritas saat server sibuk.\n\n- Limit pesan jauh lebih longgar.\n- Akses fitur-fitur terbaru lebih dulu.\n- Terhubung ke tools (Python, browsing, DALL·E).",
    type: "account",
    deliveryType: "auto",
    basePrice: 299000,
    discountPrice: 249000,
    warrantyDays: 30,
    isFeatured: true,
    soldCount: 312,
    variants: [
      { sku: "CGP-1M-SHR", name: "1 Bulan — Sharing", price: 249000, sortOrder: 10 },
      { sku: "CGP-1M-PRV", name: "1 Bulan — Private", price: 399000, sortOrder: 20 },
    ],
  },
  {
    slug: "claude-pro",
    categorySlug: "ai",
    name: "Claude Pro",
    description: "Akses Claude Sonnet & Opus dengan limit lebih besar dan prioritas.",
    type: "account",
    deliveryType: "auto",
    basePrice: 279000,
    warrantyDays: 30,
    soldCount: 88,
    variants: [
      { sku: "CLD-PRO-1M-SHR", name: "1 Bulan — Sharing", price: 279000, sortOrder: 10 },
      { sku: "CLD-PRO-1M-PRV", name: "1 Bulan — Private", price: 429000, sortOrder: 20 },
    ],
  },
  {
    slug: "midjourney",
    categorySlug: "ai",
    name: "Midjourney",
    description: "Generate gambar AI kualitas tinggi via Discord / web. Cocok untuk desainer.",
    type: "account",
    deliveryType: "auto",
    basePrice: 149000,
    warrantyDays: 30,
    soldCount: 42,
    variants: [
      { sku: "MDJ-BASIC-1M", name: "Basic Plan — 1 Bulan", price: 149000, sortOrder: 10 },
      { sku: "MDJ-STD-1M", name: "Standard Plan — 1 Bulan", price: 349000, sortOrder: 20 },
    ],
  },
  {
    slug: "gemini-advanced",
    categorySlug: "ai",
    name: "Gemini Advanced",
    description: "Akses Google Gemini 2.5 Pro, integrasi dengan Workspace, NotebookLM Plus.",
    type: "account",
    deliveryType: "auto",
    basePrice: 279000,
    warrantyDays: 30,
    soldCount: 36,
    variants: [
      { sku: "GEM-ADV-1M", name: "1 Bulan", price: 279000, sortOrder: 10 },
      { sku: "GEM-ADV-3M", name: "3 Bulan", price: 749000, sortOrder: 20 },
    ],
  },

  // Produktifitas
  {
    slug: "canva-pro",
    categorySlug: "produktifitas",
    name: "Canva Pro",
    description: "Akses fitur premium Canva: background remover, brand kit, template eksklusif.",
    type: "account",
    deliveryType: "auto",
    basePrice: 35000,
    warrantyDays: 30,
    isFeatured: true,
    soldCount: 520,
    variants: [
      { sku: "CNV-PRO-1M", name: "1 Bulan — Invite", price: 35000, sortOrder: 10 },
      { sku: "CNV-PRO-6M", name: "6 Bulan — Invite", price: 149000, sortOrder: 20 },
      { sku: "CNV-PRO-12M", name: "12 Bulan — Invite", price: 249000, sortOrder: 30 },
    ],
  },
  {
    slug: "notion-plus",
    categorySlug: "produktifitas",
    name: "Notion Plus + AI",
    description: "Workspace Notion Plus dengan kredit AI aktif. Cocok untuk tim kecil & freelancer.",
    type: "account",
    deliveryType: "auto",
    basePrice: 75000,
    warrantyDays: 30,
    soldCount: 64,
    variants: [
      { sku: "NTN-PLUS-1M", name: "1 Bulan", price: 75000, sortOrder: 10 },
      { sku: "NTN-PLUS-3M", name: "3 Bulan", price: 199000, sortOrder: 20 },
    ],
  },
  {
    slug: "office-365",
    categorySlug: "produktifitas",
    name: "Microsoft 365 Family",
    description: "Office 365 lengkap (Word, Excel, PowerPoint, Outlook) + 1 TB OneDrive.",
    type: "account",
    deliveryType: "auto",
    basePrice: 29000,
    warrantyDays: 30,
    soldCount: 130,
    variants: [
      { sku: "MS365-1M", name: "1 Bulan — Invite", price: 29000, sortOrder: 10 },
      { sku: "MS365-12M", name: "12 Bulan — Invite", price: 299000, sortOrder: 20 },
    ],
  },
  {
    slug: "jasa-top-up-credit",
    categorySlug: "produktifitas",
    name: "Jasa Top-up Kredit Platform AI",
    description:
      "Bantu top-up kredit / saldo ke berbagai platform AI / SaaS. Proses manual, maks 24 jam kerja.",
    type: "service",
    deliveryType: "manual",
    basePrice: 50000,
    warrantyDays: 0,
    soldCount: 18,
    variants: [
      { sku: "SVC-TOPUP-50K", name: "Top-up $5", price: 95000, sortOrder: 10 },
      { sku: "SVC-TOPUP-100K", name: "Top-up $10", price: 179000, sortOrder: 20 },
      { sku: "SVC-TOPUP-500K", name: "Top-up $50", price: 849000, sortOrder: 30 },
    ],
  },
];

async function upsertCategory(seed: SeedCategory): Promise<Category> {
  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, seed.slug))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(categories)
      .set({
        name: seed.name,
        icon: seed.icon,
        description: seed.description,
        sortOrder: seed.sortOrder,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, existing.id))
      .returning();
    return row ?? existing;
  }
  const [row] = await db
    .insert(categories)
    .values({
      slug: seed.slug,
      name: seed.name,
      icon: seed.icon,
      description: seed.description,
      sortOrder: seed.sortOrder,
      isActive: true,
    })
    .returning();
  if (!row) throw new Error(`Failed to insert category ${seed.slug}`);
  return row;
}

async function upsertProduct(
  seed: SeedProduct,
  categoryId: string,
): Promise<{ id: string; isNew: boolean }> {
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, seed.slug))
    .limit(1);
  if (existing) {
    await db
      .update(products)
      .set({
        name: seed.name,
        categoryId,
        description: seed.description,
        type: seed.type,
        deliveryType: seed.deliveryType,
        basePrice: seed.basePrice.toString(),
        discountPrice: seed.discountPrice?.toString() ?? null,
        warrantyDays: seed.warrantyDays,
        isActive: true,
        isFeatured: seed.isFeatured ?? false,
        soldCount: seed.soldCount ?? 0,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id));
    return { id: existing.id, isNew: false };
  }
  const [row] = await db
    .insert(products)
    .values({
      slug: seed.slug,
      name: seed.name,
      categoryId,
      description: seed.description,
      type: seed.type,
      deliveryType: seed.deliveryType,
      basePrice: seed.basePrice.toString(),
      discountPrice: seed.discountPrice?.toString() ?? null,
      warrantyDays: seed.warrantyDays,
      isActive: true,
      isFeatured: seed.isFeatured ?? false,
      soldCount: seed.soldCount ?? 0,
      images: sql`'[]'::jsonb`,
      meta: sql`'{}'::jsonb`,
    })
    .returning({ id: products.id });
  if (!row) throw new Error(`Failed to insert product ${seed.slug}`);
  return { id: row.id, isNew: true };
}

async function upsertVariant(productId: string, variant: SeedVariant, sortOrder: number) {
  const [existing] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.sku, variant.sku))
    .limit(1);
  if (existing) {
    await db
      .update(productVariants)
      .set({
        productId,
        name: variant.name,
        price: variant.price.toString(),
        description: variant.description ?? null,
        sortOrder: variant.sortOrder ?? sortOrder,
        isActive: true,
        stockMode: "tracked",
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, existing.id));
    return;
  }
  await db.insert(productVariants).values({
    productId,
    sku: variant.sku,
    name: variant.name,
    price: variant.price.toString(),
    description: variant.description ?? null,
    sortOrder: variant.sortOrder ?? sortOrder,
    isActive: true,
    stockMode: "tracked",
  });
}

async function seedCatalog() {
  console.info("[seed] Upserting categories …");
  const categoryMap = new Map<string, Category>();
  for (const seed of SEED_CATEGORIES) {
    const row = await upsertCategory(seed);
    categoryMap.set(row.slug, row);
  }
  console.info(`[seed] · ${categoryMap.size} categories ready.`);

  console.info("[seed] Upserting products + variants …");
  let newProducts = 0;
  let totalVariants = 0;
  for (const seed of SEED_PRODUCTS) {
    const category = categoryMap.get(seed.categorySlug);
    if (!category) throw new Error(`Missing seed category: ${seed.categorySlug}`);
    const { id, isNew } = await upsertProduct(seed, category.id);
    if (isNew) newProducts += 1;
    for (let i = 0; i < seed.variants.length; i += 1) {
      await upsertVariant(id, seed.variants[i]!, (i + 1) * 10);
      totalVariants += 1;
    }
  }
  console.info(
    `[seed] · ${SEED_PRODUCTS.length} products (${newProducts} new), ${totalVariants} variants.`,
  );
}

async function main() {
  await seedAdmin();
  await seedCatalog();
  console.info("[seed] Done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  });
