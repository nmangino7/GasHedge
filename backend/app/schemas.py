from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime


# --- Company Schemas ---

class CompanyCreate(BaseModel):
    name: str
    company_type: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    address_state: str
    fleet_size: int = Field(ge=1)
    vehicle_types: str = "[]"
    fuel_type: str
    monthly_gallons_gasoline: Optional[float] = None
    monthly_gallons_diesel: Optional[float] = None
    annual_revenue: Optional[float] = None
    notes: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    company_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address_state: Optional[str] = None
    fleet_size: Optional[int] = None
    vehicle_types: Optional[str] = None
    fuel_type: Optional[str] = None
    monthly_gallons_gasoline: Optional[float] = None
    monthly_gallons_diesel: Optional[float] = None
    annual_revenue: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    company_type: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str]
    address_state: str
    padd_region: str
    fleet_size: int
    vehicle_types: str
    fuel_type: str
    monthly_gallons_gasoline: Optional[float]
    monthly_gallons_diesel: Optional[float]
    annual_revenue: Optional[float]
    notes: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExposureResponse(BaseModel):
    company_id: int
    company_name: str
    fuel_type: str
    current_price_gasoline: Optional[float] = None
    current_price_diesel: Optional[float] = None
    monthly_gallons_gasoline: float = 0
    monthly_gallons_diesel: float = 0
    monthly_fuel_cost: float
    annual_fuel_cost: float
    fuel_pct_revenue: Optional[float] = None
    scenarios: list[dict]


class BenchmarkResponse(BaseModel):
    company_id: int
    company_type: str
    company_monthly_gallons: float
    industry_avg_monthly_gallons: float
    industry_range: dict
    company_fuel_pct_revenue: Optional[float] = None
    industry_avg_fuel_pct_revenue: float
    comparison: str  # "below_average", "average", "above_average"


# --- Hedging Schemas ---

class HedgeCalculateRequest(BaseModel):
    monthly_gallons: float
    fuel_type: str
    product_ticker: str
    hedge_ratio: float = Field(ge=0.0, le=1.0)
    current_fuel_price: Optional[float] = None
    current_etf_price: Optional[float] = None


class HedgePositionResponse(BaseModel):
    product_ticker: str
    product_name: str
    hedge_ratio: float
    gallons_hedged: float
    dollar_notional: float
    shares_needed: int
    annual_expense_cost: float
    correlation_to_retail: float
    effective_hedge_ratio: float
    etf_price: float


class StrategyRecommendation(BaseModel):
    tier: str  # conservative, moderate, aggressive
    product_ticker: str
    product_name: str
    hedge_ratio: float
    position: HedgePositionResponse
    rationale: str


class ScenarioResult(BaseModel):
    price_change_pct: float
    new_price_per_gallon: float
    unhedged_annual_cost: float
    hedged_annual_cost: float
    savings: float
    savings_pct: float


class HedgingPlanCreate(BaseModel):
    company_id: int
    plan_name: str
    fuel_type: str
    target_gallons: float
    hedge_instrument: str
    hedge_ratio: float
    notional_value: float
    etf_shares: float
    entry_price: float
    correlation: float = 0.85
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class HedgingPlanResponse(BaseModel):
    id: int
    company_id: int
    plan_name: str
    fuel_type: str
    target_gallons: float
    hedge_instrument: str
    hedge_ratio: float
    notional_value: float
    etf_shares: float
    entry_price: float
    correlation: float
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Deal Schemas ---

class DealCreate(BaseModel):
    company_id: int
    hedging_plan_id: Optional[int] = None
    fee_structure: str  # flat, aum_percentage, subscription
    fee_amount: float
    aum_value: Optional[float] = None
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    fee_structure: Optional[str] = None
    fee_amount: Optional[float] = None
    aum_value: Optional[float] = None
    status: Optional[str] = None
    signed_date: Optional[date] = None
    notes: Optional[str] = None


class DealResponse(BaseModel):
    id: int
    company_id: int
    hedging_plan_id: Optional[int]
    fee_structure: str
    fee_amount: float
    aum_value: Optional[float]
    annual_fee_revenue: float
    status: str
    signed_date: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    company_name: Optional[str] = None

    model_config = {"from_attributes": True}


class RevenueResponse(BaseModel):
    total_annual_revenue: float
    total_monthly_revenue: float
    active_deals: int
    pipeline_value: float
    revenue_by_type: dict
    top_clients: list[dict]


class PipelineResponse(BaseModel):
    stages: dict  # stage -> list of deals


# --- AI Schemas ---

class AIQuestionRequest(BaseModel):
    question: str
    company_id: Optional[int] = None


class AIResponse(BaseModel):
    response: str
    disclaimers: list[str]


# --- Price Schemas ---

class PricePoint(BaseModel):
    period: str
    value: float


class CurrentPriceResponse(BaseModel):
    as_of: str
    prices: list[dict]


class PriceHistoryResponse(BaseModel):
    fuel_type: str
    region: str
    region_label: str
    period_years: int
    prices: list[PricePoint]


class VolatilityResponse(BaseModel):
    fuel_type: str
    region: str
    annualized_volatility: float
    weekly_std_dev: float
    price_range_52w: dict
    current_vs_52w_avg: float
    trend: str  # rising, falling, stable


# --- Report Schemas ---

class ReportGenerateRequest(BaseModel):
    strategy_id: Optional[int] = None
    hedge_ratio: float = 0.5
    product_ticker: str = "UGA"
