// In-memory store for companies and deals.
// Data persists within a single serverless instance but resets on cold starts.
// For production persistence, integrate a hosted database (e.g. Vercel Postgres).

export interface CompanyRecord {
  id: number;
  name: string;
  company_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  address_state: string;
  padd_region: string;
  fleet_size: number;
  vehicle_types: string;
  fuel_type: string;
  monthly_gallons_gasoline: number | null;
  monthly_gallons_diesel: number | null;
  annual_revenue: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DealRecord {
  id: number;
  company_id: number;
  hedging_plan_id: number | null;
  fee_structure: string;
  fee_amount: number;
  aum_value: number | null;
  annual_fee_revenue: number;
  status: string;
  signed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATE_TO_PADD: Record<string, string> = {
  CT: "R10", ME: "R10", MA: "R10", NH: "R10", RI: "R10", VT: "R10",
  DE: "R10", DC: "R10", FL: "R10", GA: "R10", MD: "R10", NC: "R10",
  NJ: "R10", NY: "R10", PA: "R10", SC: "R10", VA: "R10", WV: "R10",
  IL: "R20", IN: "R20", IA: "R20", KS: "R20", KY: "R20", MI: "R20",
  MN: "R20", MO: "R20", NE: "R20", ND: "R20", OH: "R20", OK: "R20",
  SD: "R20", TN: "R20", WI: "R20",
  AL: "R30", AR: "R30", LA: "R30", MS: "R30", NM: "R30", TX: "R30",
  CO: "R40", ID: "R40", MT: "R40", UT: "R40", WY: "R40",
  AK: "R50", AZ: "R50", CA: "R50", HI: "R50", NV: "R50", OR: "R50", WA: "R50",
};

export function getPadd(state: string): string {
  return STATE_TO_PADD[state.toUpperCase()] || "NUS";
}

// Seed data: 3 realistic company examples
const SEED_COMPANIES: CompanyRecord[] = [
  {
    id: 1,
    name: "Martinez Landscaping & Tree Service",
    company_type: "landscaping",
    contact_name: "Carlos Martinez",
    contact_email: "carlos@martinezlandscaping.com",
    contact_phone: "512-555-0147",
    address_state: "TX",
    padd_region: "R30",
    fleet_size: 8,
    vehicle_types: '["pickup_truck","mower_trailer"]',
    fuel_type: "gasoline",
    monthly_gallons_gasoline: 1800,
    monthly_gallons_diesel: 0,
    annual_revenue: 850000,
    notes: "Family-owned since 2008. 8 crews running daily across Austin metro. Fuel costs spiked 35% last year and ate into margins. Looking for ways to stabilize fuel budget for next fiscal year. Currently has no fuel management strategy.",
    status: "active",
    created_at: "2025-11-15T10:00:00Z",
    updated_at: "2026-01-20T14:30:00Z",
  },
  {
    id: 2,
    name: "Great Plains Freight LLC",
    company_type: "trucking_local",
    contact_name: "Sarah Johnson",
    contact_email: "sjohnson@gpfreight.com",
    contact_phone: "316-555-0289",
    address_state: "KS",
    padd_region: "R20",
    fleet_size: 12,
    vehicle_types: '["semi","flatbed","box_truck"]',
    fuel_type: "diesel",
    monthly_gallons_gasoline: 0,
    monthly_gallons_diesel: 24000,
    annual_revenue: 3200000,
    notes: "Regional freight carrier covering KS, MO, OK, NE. Diesel is 32% of revenue. Lost a major bid last quarter because fuel cost estimates were too uncertain. Needs predictable fuel costs to bid competitively on contracts.",
    status: "active",
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2026-02-10T09:15:00Z",
  },
  {
    id: 3,
    name: "Bay Area Express Delivery",
    company_type: "delivery",
    contact_name: "Mike Chen",
    contact_email: "mike@bayareaexpress.com",
    contact_phone: "415-555-0193",
    address_state: "CA",
    padd_region: "R50",
    fleet_size: 25,
    vehicle_types: '["van","pickup_truck"]',
    fuel_type: "gasoline",
    monthly_gallons_gasoline: 8750,
    monthly_gallons_diesel: 0,
    annual_revenue: 4500000,
    notes: "Last-mile delivery service in SF Bay Area. West Coast gas prices are consistently the highest in the country. 25 vans averaging 350 gal/month each. Exploring hedging to protect margins as they scale to 40 vehicles by Q4.",
    status: "active",
    created_at: "2025-12-05T11:00:00Z",
    updated_at: "2026-03-01T16:45:00Z",
  },
];

const SEED_DEALS: DealRecord[] = [
  {
    id: 1,
    company_id: 2,
    hedging_plan_id: null,
    fee_structure: "aum_percentage",
    fee_amount: 1.5,
    aum_value: 120000,
    annual_fee_revenue: 1800,
    status: "active",
    signed_date: "2026-01-15",
    notes: "50% hedge on diesel via USO",
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-15T14:00:00Z",
  },
  {
    id: 2,
    company_id: 1,
    hedging_plan_id: null,
    fee_structure: "flat",
    fee_amount: 1000,
    aum_value: null,
    annual_fee_revenue: 1000,
    status: "signed",
    signed_date: "2026-02-20",
    notes: "Conservative 25% hedge plan",
    created_at: "2026-02-15T09:00:00Z",
    updated_at: "2026-02-20T11:00:00Z",
  },
  {
    id: 3,
    company_id: 3,
    hedging_plan_id: null,
    fee_structure: "subscription",
    fee_amount: 350,
    aum_value: null,
    annual_fee_revenue: 4200,
    status: "proposed",
    signed_date: null,
    notes: "Monthly monitoring + quarterly rebalancing",
    created_at: "2026-03-10T13:00:00Z",
    updated_at: "2026-03-10T13:00:00Z",
  },
];

// Singleton stores
let companies: CompanyRecord[] = [...SEED_COMPANIES];
let deals: DealRecord[] = [...SEED_DEALS];
let nextCompanyId = 4;
let nextDealId = 4;

export const companyStore = {
  list(status?: string, companyType?: string): CompanyRecord[] {
    let result = [...companies];
    if (status) result = result.filter((c) => c.status === status);
    if (companyType)
      result = result.filter((c) => c.company_type === companyType);
    return result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  get(id: number): CompanyRecord | undefined {
    return companies.find((c) => c.id === id);
  },

  create(data: {
    name: string;
    company_type: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string | null;
    address_state: string;
    fleet_size: number;
    vehicle_types?: string;
    fuel_type: string;
    monthly_gallons_gasoline?: number | null;
    monthly_gallons_diesel?: number | null;
    annual_revenue?: number | null;
    notes?: string | null;
  }): CompanyRecord {
    const now = new Date().toISOString();
    const company: CompanyRecord = {
      id: nextCompanyId++,
      name: data.name,
      company_type: data.company_type,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone || null,
      address_state: data.address_state.toUpperCase(),
      padd_region: getPadd(data.address_state),
      fleet_size: data.fleet_size,
      vehicle_types: data.vehicle_types || "[]",
      fuel_type: data.fuel_type,
      monthly_gallons_gasoline: data.monthly_gallons_gasoline ?? null,
      monthly_gallons_diesel: data.monthly_gallons_diesel ?? null,
      annual_revenue: data.annual_revenue ?? null,
      notes: data.notes ?? null,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    companies.push(company);
    return company;
  },

  update(
    id: number,
    data: Partial<Omit<CompanyRecord, "id" | "created_at">>
  ): CompanyRecord | null {
    const idx = companies.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated = {
      ...companies[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    if (data.address_state) {
      updated.padd_region = getPadd(data.address_state);
    }
    companies[idx] = updated;
    return updated;
  },

  delete(id: number): boolean {
    const idx = companies.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    companies[idx].status = "archived";
    return true;
  },
};

export const dealStore = {
  list(status?: string, companyId?: number): DealRecord[] {
    let result = [...deals];
    if (status) result = result.filter((d) => d.status === status);
    if (companyId) result = result.filter((d) => d.company_id === companyId);
    return result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  get(id: number): DealRecord | undefined {
    return deals.find((d) => d.id === id);
  },

  create(data: {
    company_id: number;
    hedging_plan_id?: number | null;
    fee_structure: string;
    fee_amount: number;
    aum_value?: number | null;
    annual_fee_revenue: number;
    notes?: string | null;
  }): DealRecord {
    const now = new Date().toISOString();
    const deal: DealRecord = {
      id: nextDealId++,
      company_id: data.company_id,
      hedging_plan_id: data.hedging_plan_id ?? null,
      fee_structure: data.fee_structure,
      fee_amount: data.fee_amount,
      aum_value: data.aum_value ?? null,
      annual_fee_revenue: data.annual_fee_revenue,
      status: "prospect",
      signed_date: null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
    deals.push(deal);
    return deal;
  },

  update(
    id: number,
    data: Partial<Omit<DealRecord, "id" | "created_at">>
  ): DealRecord | null {
    const idx = deals.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    deals[idx] = {
      ...deals[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return deals[idx];
  },
};

export const INDUSTRY_PROFILES: Record<
  string,
  {
    gallons_per_unit_per_month: { low: number; mid: number; high: number };
    fuel_pct_revenue: { low: number; mid: number; high: number };
  }
> = {
  landscaping: {
    gallons_per_unit_per_month: { low: 150, mid: 225, high: 300 },
    fuel_pct_revenue: { low: 0.05, mid: 0.08, high: 0.12 },
  },
  trucking_local: {
    gallons_per_unit_per_month: { low: 1000, mid: 2000, high: 3000 },
    fuel_pct_revenue: { low: 0.2, mid: 0.3, high: 0.4 },
  },
  trucking_longhaul: {
    gallons_per_unit_per_month: { low: 5000, mid: 7500, high: 10000 },
    fuel_pct_revenue: { low: 0.25, mid: 0.35, high: 0.45 },
  },
  delivery: {
    gallons_per_unit_per_month: { low: 200, mid: 350, high: 500 },
    fuel_pct_revenue: { low: 0.08, mid: 0.12, high: 0.18 },
  },
  construction: {
    gallons_per_unit_per_month: { low: 500, mid: 1000, high: 2000 },
    fuel_pct_revenue: { low: 0.04, mid: 0.07, high: 0.1 },
  },
};

export const DISCLAIMERS = [
  "This analysis is provided for informational purposes and constitutes investment advice under an advisory relationship. Securities recommended are limited to registered investment products (ETFs, mutual funds) for which the adviser is properly licensed under Series 65/6/63 registrations. This is not an offer to buy or sell commodity futures, swaps, or options.",
  "Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses, tracking error, and may not perfectly correlate with retail fuel prices. The value of investments can go down as well as up.",
  "Commodity ETFs structured as limited partnerships (UGA, USO, BNO, UNL) issue Schedule K-1 tax forms rather than Form 1099. Gains are typically taxed at a blended rate of 60% long-term and 40% short-term capital gains, regardless of holding period. Consult a qualified tax professional for advice specific to your situation.",
  "Hedging strategies should be evaluated based on each company's specific financial situation, risk tolerance, and fuel cost exposure. Not all strategies are suitable for all businesses. The adviser's fee schedule is disclosed in Form ADV Part 2A.",
  "HYPOTHETICAL PERFORMANCE RESULTS have many inherent limitations. No representation is made that any account will or is likely to achieve profits or losses similar to those shown. Hypothetical results do not represent actual trading and may not reflect the impact of material economic and market factors.",
];
