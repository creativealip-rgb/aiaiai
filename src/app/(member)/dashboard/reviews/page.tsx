import type { Metadata } from "next";

import { requireUser } from "@/server/auth";
import { listMemberReviews } from "@/server/queries/reviews";

import { ReviewsPanel } from "./reviews-panel";

export const metadata: Metadata = {
  title: "Dashboard · Reviews",
};

export const dynamic = "force-dynamic";

export default async function DashboardReviewsPage() {
  const user = await requireUser("/dashboard/reviews");
  const rows = await listMemberReviews(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          Tulis ulasan untuk item yang sudah delivered.
        </p>
      </div>
      <ReviewsPanel items={rows} />
    </div>
  );
}

