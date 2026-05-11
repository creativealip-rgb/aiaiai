import { z } from "zod";

export const createReviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

