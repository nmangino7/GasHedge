import type {
  Company, CompanyCreate, ExposureData, BenchmarkData,
  CurrentPrice, PricePoint, HedgePosition, StrategyRecommendation,
  ScenarioResult, Deal, RevenueData, AIResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchJson<T>(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const timeoutMs = options?.timeoutMs || 60000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeoutMs: _, ...fetchOpts } = options || {};
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...fetchOpts?.headers },
      ...fetchOpts,
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorMessage = `API Error (${res.status})`;
      try {
        const errBody = await res.json();
        errorMessage = errBody.error || errBody.detail || errorMessage;
        if (errBody.details) errorMessage += ` — ${errBody.details}`;
      } catch {
        const text = await res.text().catch(() => "");
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds. The server may be overloaded.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Companies
export const companiesApi = {
  list: (status?: string) =>
    fetchJson<Company[]>(`/companies${status ? `?status=${status}` : ""}`),
  get: (id: number) => fetchJson<Company>(`/companies/${id}`),
  create: (data: CompanyCreate) =>
    fetchJson<Company>("/companies", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Company>) =>
    fetchJson<Company>(`/companies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchJson<{ status: string }>(`/companies/${id}`, { method: "DELETE" }),
  getExposure: (id: number) => fetchJson<ExposureData>(`/companies/${id}/exposure`),
  getBenchmark: (id: number) => fetchJson<BenchmarkData>(`/companies/${id}/benchmark`),
};

// Prices
export const pricesApi = {
  current: () => fetchJson<{ as_of: string; prices: CurrentPrice[] }>("/prices/current"),
  history: (fuelType: string, region: string, years = 5) =>
    fetchJson<{ prices: PricePoint[]; fuel_type: string; region_label: string }>(`/prices/history/${fuelType}/${region}?years=${years}`),
  volatility: (fuelType: string, region: string) =>
    fetchJson<{
      fuel_type: string; region: string; annualized_volatility: number;
      weekly_std_dev: number; price_range_52w: { min: number; max: number };
      current_vs_52w_avg: number; trend: string;
    }>(`/prices/volatility/${fuelType}/${region}`),
  comparison: (fuelType = "gasoline") =>
    fetchJson<{ fuel_type: string; regions: { region: string; region_label: string; price_per_gallon: number }[] }>(`/prices/comparison?fuel_type=${fuelType}`),
};

// Hedging
export const hedgingApi = {
  recommend: (companyId: number) =>
    fetchJson<{
      company_id: number; company_name: string; fuel_type: string;
      monthly_gallons: number; current_fuel_price: number;
      recommendations: StrategyRecommendation[];
    }>(`/hedging/recommend/${companyId}`),
  calculate: (data: { monthly_gallons: number; fuel_type: string; product_ticker: string; hedge_ratio: number }) =>
    fetchJson<HedgePosition>("/hedging/calculate", { method: "POST", body: JSON.stringify(data) }),
  scenarios: (companyId: number, hedgeRatio = 0.5, ticker = "UGA") =>
    fetchJson<{ company_id: number; hedge_position: HedgePosition; scenarios: ScenarioResult[] }>(
      `/hedging/scenarios/${companyId}?hedge_ratio=${hedgeRatio}&product_ticker=${ticker}`
    ),
  backtest: (companyId: number, years = 3, hedgeRatio = 0.5, ticker = "UGA") =>
    fetchJson<{
      periods: { date: string; cumulative_savings: number; fuel_price: number }[];
      total_unhedged_cost: number; total_hedged_cost: number;
      total_savings: number; savings_pct: number;
    }>(`/hedging/backtest/${companyId}?years=${years}&hedge_ratio=${hedgeRatio}&product_ticker=${ticker}`),
  allStrategies: (companyId: number, hedgeRatio = 0.5) =>
    fetchJson<{
      company_id: number; company_name: string; fuel_type: string;
      monthly_gallons: number; current_fuel_price: number; hedge_ratio: number;
      etf: StrategyRecommendation[];
      options: { approach: string; contracts_needed: number; total_premium: number; max_loss: number; breakeven_price: number; strike_price: number; description: string; license_required: string };
      futures: { approach: string; contracts_needed: number; total_margin_required: number; notional_value: number; correlation: number; description: string; license_required: string };
      comparison: { approach: string; annual_cost: number; upfront_capital: number; max_loss: string; correlation: string; liquidity: string; complexity: string; license: string; best_for: string }[];
    }>(`/hedging/all-strategies/${companyId}?hedge_ratio=${hedgeRatio}`),
};

// Deals
export const dealsApi = {
  list: (filter?: { status?: string; companyId?: number }) => {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.companyId !== undefined) params.set("company_id", String(filter.companyId));
    const qs = params.toString();
    return fetchJson<Deal[]>(`/deals${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => fetchJson<Deal>(`/deals/${id}`),
  create: (data: { company_id: number; fee_structure: string; fee_amount: number; aum_value?: number; notes?: string }) =>
    fetchJson<Deal>("/deals", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Deal>) =>
    fetchJson<Deal>(`/deals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchJson<{ status: string }>(`/deals/${id}`, { method: "DELETE" }),
  revenue: () => fetchJson<RevenueData>("/deals/revenue"),
  pipeline: () => fetchJson<{ stages: Record<string, Deal[]> }>("/deals/pipeline"),
};

// Hedging plans (persisted)
export interface HedgingPlan {
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

export const hedgingPlansApi = {
  list: (companyId?: number) =>
    fetchJson<HedgingPlan[]>(
      `/hedging-plans${companyId !== undefined ? `?company_id=${companyId}` : ""}`
    ),
  get: (id: number) =>
    fetchJson<HedgingPlan & { company_name: string }>(`/hedging-plans/${id}`),
  create: (data: Omit<HedgingPlan, "id" | "created_at" | "updated_at">) =>
    fetchJson<HedgingPlan>("/hedging-plans", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchJson<{ status: string }>(`/hedging-plans/${id}`, { method: "DELETE" }),
};

// AI
export const aiApi = {
  recommend: (companyId: number) =>
    fetchJson<AIResponse>(`/ai/recommend/${companyId}`, { method: "POST", timeoutMs: 90000 }),
  ask: (question: string, companyId?: number) =>
    fetchJson<AIResponse>("/ai/ask", {
      method: "POST",
      body: JSON.stringify({ question, company_id: companyId }),
      timeoutMs: 90000,
    }),
  marketOutlook: () => fetchJson<AIResponse>("/ai/market-outlook", { timeoutMs: 90000 }),
  deepReport: (companyId: number) =>
    fetchJson<AIResponse>(`/ai/deep-report/${companyId}`, { method: "POST", timeoutMs: 120000 }),
};

// Reports
export const reportsApi = {
  detailed: (companyId: number, hedgeRatio = 0.5, ticker = "UGA") =>
    fetchJson<{
      company: { id: number; name: string; company_type: string; fuel_type: string; fleet_size: number; region: string; monthly_gallons: number; annual_revenue: number | null };
      current_price: number;
      strategies: { tier: string; product_ticker: string; product_name: string; hedge_ratio: number; position: HedgePosition; rationale: string }[];
      selected_hedge_ratio: number;
      selected_ticker: string;
      hedge_position: HedgePosition;
      detailed_scenarios: {
        scenarios: ScenarioResult[];
        breakeven: { price_change_pct: number; fuel_price_per_gallon: number; description: string };
        monthly_projections: { month: string; unhedged_cost: number; hedged_cost: number; savings: number }[];
        annual_summary: { current_annual_cost: number; hedge_annual_expense: number; gallons_hedged: number; effective_coverage: number };
      };
      volatility: { annualized_volatility: number; trend: string; price_range_52w: { min: number; max: number } } | null;
    }>(`/reports/detailed/${companyId}?hedge_ratio=${hedgeRatio}&product_ticker=${ticker}`),
  generateHtml: (companyId: number, hedgeRatio = 0.5, ticker = "UGA") =>
    `${API_BASE}/reports/generate/${companyId}?hedge_ratio=${hedgeRatio}&product_ticker=${ticker}`,
};
