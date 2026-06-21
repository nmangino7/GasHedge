import { z } from "zod";

// Permissive enough to accept every currently-valid payload from the onboarding
// form, strict enough to reject the genuinely-broken input that had no guard.
export const CompanyCreateSchema = z
  .object({
    name: z.string().min(1, "name is required"),
    company_type: z.string().min(1, "company_type is required"),
    contact_name: z.string().min(1, "contact_name is required"),
    contact_email: z.string().min(1, "contact_email is required"),
    contact_phone: z.string().nullish(),
    address_state: z.string().min(1, "address_state is required"),
    fleet_size: z.coerce.number().int().min(0).default(0),
    vehicle_types: z.union([z.string(), z.array(z.string())]).optional(),
    fuel_type: z.string().min(1, "fuel_type is required"),
    monthly_gallons_gasoline: z.coerce.number().min(0).nullish(),
    monthly_gallons_diesel: z.coerce.number().min(0).nullish(),
    annual_revenue: z.coerce.number().min(0).nullish(),
    notes: z.string().nullish(),
    status: z.string().optional(),
  })
  .passthrough();

export const CompanyUpdateSchema = CompanyCreateSchema.partial();
