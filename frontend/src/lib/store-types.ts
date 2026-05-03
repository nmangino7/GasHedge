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

export interface HedgingPlanRecord {
  id: number;
  company_id: number;
  deal_id: number | null;
  approach: string;
  tier: string;
  hedge_ratio: number;
  product_ticker: string;
  brokerage: string;
  brokerage_other: string | null;
  start_timing: string;
  custom_date: string | null;
  rebalance_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreateInput {
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
}

export interface DealCreateInput {
  company_id: number;
  hedging_plan_id?: number | null;
  fee_structure: string;
  fee_amount: number;
  aum_value?: number | null;
  annual_fee_revenue: number;
  notes?: string | null;
}

export interface HedgingPlanCreateInput {
  company_id: number;
  deal_id?: number | null;
  approach: string;
  tier: string;
  hedge_ratio: number;
  product_ticker: string;
  brokerage: string;
  brokerage_other?: string | null;
  start_timing: string;
  custom_date?: string | null;
  rebalance_frequency: string;
}
