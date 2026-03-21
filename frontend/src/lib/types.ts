export interface Company {
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

export interface CompanyCreate {
  name: string;
  company_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address_state: string;
  fleet_size: number;
  vehicle_types: string;
  fuel_type: string;
  monthly_gallons_gasoline?: number;
  monthly_gallons_diesel?: number;
  annual_revenue?: number;
  notes?: string;
}

export interface ExposureData {
  company_id: number;
  company_name: string;
  fuel_type: string;
  current_price_gasoline: number | null;
  current_price_diesel: number | null;
  monthly_gallons_gasoline: number;
  monthly_gallons_diesel: number;
  monthly_fuel_cost: number;
  annual_fuel_cost: number;
  fuel_pct_revenue: number | null;
  scenarios: ScenarioShock[];
}

export interface ScenarioShock {
  price_change_pct: number;
  label: string;
  monthly_cost: number;
  annual_cost: number;
  additional_annual_cost: number;
}

export interface BenchmarkData {
  company_id: number;
  company_type: string;
  company_monthly_gallons: number;
  industry_avg_monthly_gallons: number;
  industry_range: { low: number; mid: number; high: number };
  company_fuel_pct_revenue: number | null;
  industry_avg_fuel_pct_revenue: number;
  comparison: string;
}

export interface PricePoint {
  period: string;
  value: number;
}

export interface CurrentPrice {
  fuel_type: string;
  region: string;
  region_label: string;
  price_per_gallon: number;
  week_change: number;
  week_change_pct: number;
}

export interface HedgePosition {
  product_ticker: string;
  product_name: string;
  hedge_ratio: number;
  gallons_hedged: number;
  dollar_notional: number;
  shares_needed: number;
  annual_expense_cost: number;
  correlation_to_retail: number;
  effective_hedge_ratio: number;
  etf_price: number;
}

export interface StrategyRecommendation {
  tier: string;
  product_ticker: string;
  product_name: string;
  hedge_ratio: number;
  position: HedgePosition;
  rationale: string;
}

export interface ScenarioResult {
  price_change_pct: number;
  new_price_per_gallon: number;
  unhedged_annual_cost: number;
  hedged_annual_cost: number;
  savings: number;
  savings_pct: number;
}

export interface Deal {
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
  company_name: string | null;
}

export interface RevenueData {
  total_annual_revenue: number;
  total_monthly_revenue: number;
  active_deals: number;
  pipeline_value: number;
  revenue_by_type: Record<string, number>;
  top_clients: { company_id: number; company_name: string; annual_revenue: number; deal_count: number }[];
}


export interface AIResponse {
  response: string;
  disclaimers: string[];
}

export interface OptionsStrategy {
  approach: "options";
  contracts_needed: number;
  contract_size_gallons: number;
  total_premium: number;
  max_loss: number;
  breakeven_price: number;
  strike_price: number;
  expiry_months: number;
  license_required: "Series 3";
  description: string;
}

export interface FuturesStrategy {
  approach: "futures";
  contracts_needed: number;
  contract_size_gallons: number;
  margin_per_contract: number;
  total_margin_required: number;
  notional_value: number;
  correlation: number;
  license_required: "Series 3";
  description: string;
}

export interface AllStrategies {
  etf: StrategyRecommendation[];
  options: OptionsStrategy;
  futures: FuturesStrategy;
  comparison: {
    approach: string;
    annual_cost: number;
    upfront_capital: number;
    max_loss: string;
    correlation: string;
    liquidity: string;
    complexity: string;
    license: string;
    best_for: string;
  }[];
}
