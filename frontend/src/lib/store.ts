import { ensureSchema, isDbConfigured, sql } from "./db";
import { SEED_COMPANIES, SEED_DEALS } from "./seed";
import type {
  CompanyRecord,
  DealRecord,
  HedgingPlanRecord,
  CompanyCreateInput,
  DealCreateInput,
  HedgingPlanCreateInput,
} from "./store-types";

export type {
  CompanyRecord,
  DealRecord,
  HedgingPlanRecord,
  CompanyCreateInput,
  DealCreateInput,
  HedgingPlanCreateInput,
};

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

const memCompanies: CompanyRecord[] = SEED_COMPANIES.map((c) => ({ ...c }));
const memDeals: DealRecord[] = SEED_DEALS.map((d) => ({ ...d }));
const memPlans: HedgingPlanRecord[] = [];
let nextCompanyId = Math.max(...memCompanies.map((c) => c.id), 0) + 1;
let nextDealId = Math.max(...memDeals.map((d) => d.id), 0) + 1;
let nextPlanId = 1;

type DbCompanyRow = {
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
  monthly_gallons_gasoline: string | number | null;
  monthly_gallons_diesel: string | number | null;
  annual_revenue: string | number | null;
  notes: string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbDealRow = {
  id: number;
  company_id: number;
  hedging_plan_id: number | null;
  fee_structure: string;
  fee_amount: string | number;
  aum_value: string | number | null;
  annual_fee_revenue: string | number;
  status: string;
  signed_date: Date | string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbPlanRow = {
  id: number;
  company_id: number;
  deal_id: number | null;
  approach: string;
  tier: string;
  hedge_ratio: string | number;
  product_ticker: string;
  brokerage: string;
  brokerage_other: string | null;
  start_timing: string;
  custom_date: Date | string | null;
  rebalance_frequency: string;
  created_at: Date | string;
  updated_at: Date | string;
};

const num = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined ? null : typeof v === "number" ? v : Number(v);

const numReq = (v: string | number): number =>
  typeof v === "number" ? v : Number(v);

const iso = (v: Date | string): string =>
  typeof v === "string" ? v : v.toISOString();

const isoNullable = (v: Date | string | null): string | null =>
  v === null ? null : typeof v === "string" ? v : v.toISOString().slice(0, 10);

const mapCompany = (r: DbCompanyRow): CompanyRecord => ({
  id: r.id,
  name: r.name,
  company_type: r.company_type,
  contact_name: r.contact_name,
  contact_email: r.contact_email,
  contact_phone: r.contact_phone,
  address_state: r.address_state,
  padd_region: r.padd_region,
  fleet_size: r.fleet_size,
  vehicle_types: r.vehicle_types,
  fuel_type: r.fuel_type,
  monthly_gallons_gasoline: num(r.monthly_gallons_gasoline),
  monthly_gallons_diesel: num(r.monthly_gallons_diesel),
  annual_revenue: num(r.annual_revenue),
  notes: r.notes,
  status: r.status,
  created_at: iso(r.created_at),
  updated_at: iso(r.updated_at),
});

const mapDeal = (r: DbDealRow): DealRecord => ({
  id: r.id,
  company_id: r.company_id,
  hedging_plan_id: r.hedging_plan_id,
  fee_structure: r.fee_structure,
  fee_amount: numReq(r.fee_amount),
  aum_value: num(r.aum_value),
  annual_fee_revenue: numReq(r.annual_fee_revenue),
  status: r.status,
  signed_date: isoNullable(r.signed_date),
  notes: r.notes,
  created_at: iso(r.created_at),
  updated_at: iso(r.updated_at),
});

const mapPlan = (r: DbPlanRow): HedgingPlanRecord => ({
  id: r.id,
  company_id: r.company_id,
  deal_id: r.deal_id,
  approach: r.approach,
  tier: r.tier,
  hedge_ratio: numReq(r.hedge_ratio),
  product_ticker: r.product_ticker,
  brokerage: r.brokerage,
  brokerage_other: r.brokerage_other,
  start_timing: r.start_timing,
  custom_date: isoNullable(r.custom_date),
  rebalance_frequency: r.rebalance_frequency,
  created_at: iso(r.created_at),
  updated_at: iso(r.updated_at),
});

// ---------- Companies ----------

export const companyStore = {
  async list(status?: string, companyType?: string): Promise<CompanyRecord[]> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = status && companyType
        ? await sql<DbCompanyRow>`SELECT * FROM companies WHERE status = ${status} AND company_type = ${companyType} ORDER BY created_at DESC`
        : status
        ? await sql<DbCompanyRow>`SELECT * FROM companies WHERE status = ${status} ORDER BY created_at DESC`
        : companyType
        ? await sql<DbCompanyRow>`SELECT * FROM companies WHERE company_type = ${companyType} ORDER BY created_at DESC`
        : await sql<DbCompanyRow>`SELECT * FROM companies ORDER BY created_at DESC`;
      return rows.map(mapCompany);
    }
    let result = [...memCompanies];
    if (status) result = result.filter((c) => c.status === status);
    if (companyType) result = result.filter((c) => c.company_type === companyType);
    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async get(id: number): Promise<CompanyRecord | undefined> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = await sql<DbCompanyRow>`SELECT * FROM companies WHERE id = ${id}`;
      return rows[0] ? mapCompany(rows[0]) : undefined;
    }
    return memCompanies.find((c) => c.id === id);
  },

  async create(data: CompanyCreateInput): Promise<CompanyRecord> {
    const padd = getPadd(data.address_state);
    const state = data.address_state.toUpperCase();
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = await sql<DbCompanyRow>`
        INSERT INTO companies (
          name, company_type, contact_name, contact_email, contact_phone,
          address_state, padd_region, fleet_size, vehicle_types, fuel_type,
          monthly_gallons_gasoline, monthly_gallons_diesel, annual_revenue, notes, status
        ) VALUES (
          ${data.name}, ${data.company_type}, ${data.contact_name}, ${data.contact_email},
          ${data.contact_phone ?? null}, ${state}, ${padd}, ${data.fleet_size},
          ${data.vehicle_types ?? "[]"}, ${data.fuel_type},
          ${data.monthly_gallons_gasoline ?? null}, ${data.monthly_gallons_diesel ?? null},
          ${data.annual_revenue ?? null}, ${data.notes ?? null}, 'active'
        ) RETURNING *
      `;
      return mapCompany(rows[0]);
    }
    const now = new Date().toISOString();
    const company: CompanyRecord = {
      id: nextCompanyId++,
      name: data.name,
      company_type: data.company_type,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone ?? null,
      address_state: state,
      padd_region: padd,
      fleet_size: data.fleet_size,
      vehicle_types: data.vehicle_types ?? "[]",
      fuel_type: data.fuel_type,
      monthly_gallons_gasoline: data.monthly_gallons_gasoline ?? null,
      monthly_gallons_diesel: data.monthly_gallons_diesel ?? null,
      annual_revenue: data.annual_revenue ?? null,
      notes: data.notes ?? null,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    memCompanies.push(company);
    return company;
  },

  async update(
    id: number,
    data: Partial<Omit<CompanyRecord, "id" | "created_at">>
  ): Promise<CompanyRecord | null> {
    if (isDbConfigured()) {
      await ensureSchema();
      const existing = await companyStore.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...data };
      if (data.address_state) merged.padd_region = getPadd(data.address_state);
      const { rows } = await sql<DbCompanyRow>`
        UPDATE companies SET
          name = ${merged.name},
          company_type = ${merged.company_type},
          contact_name = ${merged.contact_name},
          contact_email = ${merged.contact_email},
          contact_phone = ${merged.contact_phone},
          address_state = ${merged.address_state},
          padd_region = ${merged.padd_region},
          fleet_size = ${merged.fleet_size},
          vehicle_types = ${merged.vehicle_types},
          fuel_type = ${merged.fuel_type},
          monthly_gallons_gasoline = ${merged.monthly_gallons_gasoline},
          monthly_gallons_diesel = ${merged.monthly_gallons_diesel},
          annual_revenue = ${merged.annual_revenue},
          notes = ${merged.notes},
          status = ${merged.status},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0] ? mapCompany(rows[0]) : null;
    }
    const idx = memCompanies.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated: CompanyRecord = {
      ...memCompanies[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    if (data.address_state) updated.padd_region = getPadd(data.address_state);
    memCompanies[idx] = updated;
    return updated;
  },

  async delete(id: number): Promise<boolean> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rowCount } = await sql`UPDATE companies SET status = 'archived', updated_at = NOW() WHERE id = ${id}`;
      return (rowCount ?? 0) > 0;
    }
    const idx = memCompanies.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    memCompanies[idx].status = "archived";
    return true;
  },
};

// ---------- Deals ----------

export const dealStore = {
  async list(status?: string, companyId?: number): Promise<DealRecord[]> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = status && companyId
        ? await sql<DbDealRow>`SELECT * FROM deals WHERE status = ${status} AND company_id = ${companyId} ORDER BY created_at DESC`
        : status
        ? await sql<DbDealRow>`SELECT * FROM deals WHERE status = ${status} ORDER BY created_at DESC`
        : companyId
        ? await sql<DbDealRow>`SELECT * FROM deals WHERE company_id = ${companyId} ORDER BY created_at DESC`
        : await sql<DbDealRow>`SELECT * FROM deals ORDER BY created_at DESC`;
      return rows.map(mapDeal);
    }
    let result = [...memDeals];
    if (status) result = result.filter((d) => d.status === status);
    if (companyId) result = result.filter((d) => d.company_id === companyId);
    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async get(id: number): Promise<DealRecord | undefined> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = await sql<DbDealRow>`SELECT * FROM deals WHERE id = ${id}`;
      return rows[0] ? mapDeal(rows[0]) : undefined;
    }
    return memDeals.find((d) => d.id === id);
  },

  async create(data: DealCreateInput): Promise<DealRecord> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = await sql<DbDealRow>`
        INSERT INTO deals (
          company_id, hedging_plan_id, fee_structure, fee_amount, aum_value,
          annual_fee_revenue, status, notes
        ) VALUES (
          ${data.company_id}, ${data.hedging_plan_id ?? null}, ${data.fee_structure},
          ${data.fee_amount}, ${data.aum_value ?? null}, ${data.annual_fee_revenue},
          'prospect', ${data.notes ?? null}
        ) RETURNING *
      `;
      return mapDeal(rows[0]);
    }
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
    memDeals.push(deal);
    return deal;
  },

  async update(
    id: number,
    data: Partial<Omit<DealRecord, "id" | "created_at">>
  ): Promise<DealRecord | null> {
    if (isDbConfigured()) {
      await ensureSchema();
      const existing = await dealStore.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...data };
      const signedDate = merged.signed_date;
      const { rows } = await sql<DbDealRow>`
        UPDATE deals SET
          company_id = ${merged.company_id},
          hedging_plan_id = ${merged.hedging_plan_id},
          fee_structure = ${merged.fee_structure},
          fee_amount = ${merged.fee_amount},
          aum_value = ${merged.aum_value},
          annual_fee_revenue = ${merged.annual_fee_revenue},
          status = ${merged.status},
          signed_date = ${signedDate},
          notes = ${merged.notes},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0] ? mapDeal(rows[0]) : null;
    }
    const idx = memDeals.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    memDeals[idx] = {
      ...memDeals[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return memDeals[idx];
  },

  async delete(id: number): Promise<boolean> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rowCount } = await sql`DELETE FROM deals WHERE id = ${id}`;
      return (rowCount ?? 0) > 0;
    }
    const idx = memDeals.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    memDeals.splice(idx, 1);
    return true;
  },
};

// ---------- Hedging Plans ----------

export const hedgingPlanStore = {
  async list(companyId?: number): Promise<HedgingPlanRecord[]> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = companyId
        ? await sql<DbPlanRow>`SELECT * FROM hedging_plans WHERE company_id = ${companyId} ORDER BY created_at DESC`
        : await sql<DbPlanRow>`SELECT * FROM hedging_plans ORDER BY created_at DESC`;
      return rows.map(mapPlan);
    }
    let result = [...memPlans];
    if (companyId) result = result.filter((p) => p.company_id === companyId);
    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async get(id: number): Promise<HedgingPlanRecord | undefined> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = await sql<DbPlanRow>`SELECT * FROM hedging_plans WHERE id = ${id}`;
      return rows[0] ? mapPlan(rows[0]) : undefined;
    }
    return memPlans.find((p) => p.id === id);
  },

  async create(data: HedgingPlanCreateInput): Promise<HedgingPlanRecord> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rows } = await sql<DbPlanRow>`
        INSERT INTO hedging_plans (
          company_id, deal_id, approach, tier, hedge_ratio, product_ticker,
          brokerage, brokerage_other, start_timing, custom_date, rebalance_frequency
        ) VALUES (
          ${data.company_id}, ${data.deal_id ?? null}, ${data.approach}, ${data.tier},
          ${data.hedge_ratio}, ${data.product_ticker}, ${data.brokerage},
          ${data.brokerage_other ?? null}, ${data.start_timing},
          ${data.custom_date ?? null}, ${data.rebalance_frequency}
        ) RETURNING *
      `;
      return mapPlan(rows[0]);
    }
    const now = new Date().toISOString();
    const plan: HedgingPlanRecord = {
      id: nextPlanId++,
      company_id: data.company_id,
      deal_id: data.deal_id ?? null,
      approach: data.approach,
      tier: data.tier,
      hedge_ratio: data.hedge_ratio,
      product_ticker: data.product_ticker,
      brokerage: data.brokerage,
      brokerage_other: data.brokerage_other ?? null,
      start_timing: data.start_timing,
      custom_date: data.custom_date ?? null,
      rebalance_frequency: data.rebalance_frequency,
      created_at: now,
      updated_at: now,
    };
    memPlans.push(plan);
    return plan;
  },

  async delete(id: number): Promise<boolean> {
    if (isDbConfigured()) {
      await ensureSchema();
      const { rowCount } = await sql`DELETE FROM hedging_plans WHERE id = ${id}`;
      return (rowCount ?? 0) > 0;
    }
    const idx = memPlans.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    memPlans.splice(idx, 1);
    return true;
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
  "HYPOTHETICAL PERFORMANCE RESULTS have many inherent limitations. No representation is made that any account will or is likely to achieve profits or losses similar to those shown. Hypothetical results do not represent actual trading and may not reflect the impact of material economic and market factors. ETF-based hedging involves market risk and does not guarantee cost savings.",
];
