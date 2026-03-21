import type {
  Company, CompanyCreate, ExposureData, BenchmarkData,
  CurrentPrice, PricePoint, HedgePosition, StrategyRecommendation,
  ScenarioResult, Deal, RevenueData, AIResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
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
      throw new Error("Request timed out after 30 seconds. The server may be overloaded.");
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
};

// Deals
export const dealsApi = {
  list: (status?: string) =>
    fetchJson<Deal[]>(`/deals${status ? `?status=${status}` : ""}`),
  get: (id: number) => fetchJson<Deal>(`/deals/${id}`),
  create: (data: { company_id: number; fee_structure: string; fee_amount: number; aum_value?: number; notes?: string }) =>
    fetchJson<Deal>("/deals", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Deal>) =>
    fetchJson<Deal>(`/deals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  revenue: () => fetchJson<RevenueData>("/deals/revenue"),
  pipeline: () => fetchJson<{ stages: Record<string, Deal[]> }>("/deals/pipeline"),
};

// AI
export const aiApi = {
  recommend: (companyId: number) =>
    fetchJson<AIResponse>(`/ai/recommend/${companyId}`, { method: "POST" }),
  ask: (question: string, companyId?: number) =>
    fetchJson<AIResponse>("/ai/ask", {
      method: "POST",
      body: JSON.stringify({ question, company_id: companyId }),
    }),
  marketOutlook: () => fetchJson<AIResponse>("/ai/market-outlook"),
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
