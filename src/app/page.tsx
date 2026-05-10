import { sql } from "drizzle-orm";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { env } from "@/lib/env";

// Force dynamic rendering so the DB probe runs on each request, not at build.
export const dynamic = "force-dynamic";

/**
 * Fase 0 landing page / setup smoke test.
 * Replaces the default "Hello world" until the real landing page is built
 * in a later fase.
 */
export default function Home() {
  return (
    <main className="bg-background min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</h1>
          <p className="text-muted-foreground text-sm">
            Marketplace akun & jasa digital — landing page akan dibangun di Fase 2.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Fase 0 — Setup</CardTitle>
            <CardDescription>
              Status runtime untuk memverifikasi fondasi proyek berjalan baik.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Environment" value={env.NODE_ENV} />
            <Row label="App URL" value={env.NEXT_PUBLIC_APP_URL} />
            <Row
              label="Node.js runtime"
              value={typeof process !== "undefined" ? process.version : "unknown"}
            />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Database</span>
              <Suspense fallback={<Badge variant="outline">checking…</Badge>}>
                <DatabaseStatus />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <code className="bg-muted rounded px-2 py-0.5 text-xs">{value}</code>
    </div>
  );
}

async function DatabaseStatus() {
  let errorMessage: string | undefined;
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "unknown error";
  }

  if (!errorMessage) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">connected</Badge>;
  }
  return (
    <Badge variant="destructive" title={errorMessage}>
      unreachable
    </Badge>
  );
}
