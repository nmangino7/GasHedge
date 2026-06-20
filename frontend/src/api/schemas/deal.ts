import { z } from "zod";

export const DealCreateSchema = z
  .object({
    company_id: z.coerce.number().int().positive("company_id is required"),
    fee_structure: z.enum(["flat", "aum_percentage", "subscription"]),
    fee_amount: z.coerce.number().min(0),
    aum_value: z.coerce.number().min(0).nullish(),
    status: z.string().optional(),
    hedging_plan_id: z.coerce.number().int().nullish(),
    signed_date: z.string().nullish(),
    notes: z.string().nullish(),
  })
  .passthrough();

export const DealUpdateSchema = DealCreateSchema.partial();
