import { sql as vercelSql, type VercelPoolClient } from "@vercel/postgres";
import { SEED_COMPANIES, SEED_DEALS, SEED_OPTION_POSITIONS } from "./seed";

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING
  );
}

export const sql = vercelSql;
export type { VercelPoolClient };

let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!isDbConfigured()) return;
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        company_type TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_phone TEXT,
        address_state TEXT NOT NULL,
        padd_region TEXT NOT NULL,
        fleet_size INTEGER NOT NULL DEFAULT 0,
        vehicle_types TEXT NOT NULL DEFAULT '[]',
        fuel_type TEXT NOT NULL,
        monthly_gallons_gasoline NUMERIC,
        monthly_gallons_diesel NUMERIC,
        annual_revenue NUMERIC,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        hedging_plan_id INTEGER,
        fee_structure TEXT NOT NULL,
        fee_amount NUMERIC NOT NULL,
        aum_value NUMERIC,
        annual_fee_revenue NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'prospect',
        signed_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS hedging_plans (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
        approach TEXT NOT NULL,
        tier TEXT NOT NULL,
        hedge_ratio NUMERIC NOT NULL,
        product_ticker TEXT NOT NULL,
        brokerage TEXT NOT NULL,
        brokerage_other TEXT,
        start_timing TEXT NOT NULL,
        custom_date DATE,
        rebalance_frequency TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS option_positions (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        strategy_key TEXT NOT NULL,
        ticker TEXT NOT NULL,
        option_type TEXT NOT NULL,
        side TEXT NOT NULL,
        strike NUMERIC NOT NULL,
        expiry DATE NOT NULL,
        contracts INTEGER NOT NULL,
        entry_premium_per_share NUMERIC NOT NULL,
        entry_underlying_price NUMERIC NOT NULL,
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'open',
        exit_premium_per_share NUMERIC,
        exit_underlying_price NUMERIC,
        closed_at TIMESTAMPTZ,
        iv_used NUMERIC,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS option_positions_deal_idx ON option_positions(deal_id)`;
    await sql`CREATE INDEX IF NOT EXISTS option_positions_status_idx ON option_positions(status)`;
    const { rows: companyCount } = await sql`SELECT COUNT(*)::int AS c FROM companies`;
    if (companyCount[0]?.c === 0) {
      for (const c of SEED_COMPANIES) {
        await sql`
          INSERT INTO companies (
            id, name, company_type, contact_name, contact_email, contact_phone,
            address_state, padd_region, fleet_size, vehicle_types, fuel_type,
            monthly_gallons_gasoline, monthly_gallons_diesel, annual_revenue,
            notes, status, created_at, updated_at
          ) VALUES (
            ${c.id}, ${c.name}, ${c.company_type}, ${c.contact_name}, ${c.contact_email},
            ${c.contact_phone}, ${c.address_state}, ${c.padd_region}, ${c.fleet_size},
            ${c.vehicle_types}, ${c.fuel_type}, ${c.monthly_gallons_gasoline},
            ${c.monthly_gallons_diesel}, ${c.annual_revenue}, ${c.notes}, ${c.status},
            ${c.created_at}, ${c.updated_at}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      await sql`SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies))`;
      for (const d of SEED_DEALS) {
        await sql`
          INSERT INTO deals (
            id, company_id, hedging_plan_id, fee_structure, fee_amount, aum_value,
            annual_fee_revenue, status, signed_date, notes, created_at, updated_at
          ) VALUES (
            ${d.id}, ${d.company_id}, ${d.hedging_plan_id}, ${d.fee_structure},
            ${d.fee_amount}, ${d.aum_value}, ${d.annual_fee_revenue}, ${d.status},
            ${d.signed_date}, ${d.notes}, ${d.created_at}, ${d.updated_at}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      await sql`SELECT setval('deals_id_seq', (SELECT MAX(id) FROM deals))`;
      for (const p of SEED_OPTION_POSITIONS) {
        await sql`
          INSERT INTO option_positions (
            id, deal_id, strategy_key, ticker, option_type, side, strike, expiry,
            contracts, entry_premium_per_share, entry_underlying_price,
            opened_at, status, iv_used, notes, created_at, updated_at
          ) VALUES (
            ${p.id}, ${p.deal_id}, ${p.strategy_key}, ${p.ticker}, ${p.option_type},
            ${p.side}, ${p.strike}, ${p.expiry}, ${p.contracts},
            ${p.entry_premium_per_share}, ${p.entry_underlying_price},
            ${p.opened_at}, ${p.status}, ${p.iv_used}, ${p.notes},
            ${p.created_at}, ${p.updated_at}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      await sql`SELECT setval('option_positions_id_seq', GREATEST((SELECT MAX(id) FROM option_positions), 1))`;
    }
  })().catch((err) => {
    schemaPromise = null;
    throw err;
  });
  return schemaPromise;
}
