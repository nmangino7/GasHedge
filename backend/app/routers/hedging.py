from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.company import Company, HedgingPlan
from app.schemas import (
    HedgeCalculateRequest, HedgePositionResponse, StrategyRecommendation,
    ScenarioResult, HedgingPlanCreate, HedgingPlanResponse,
)
from app.services.eia_service import eia_service
from app.services.hedging_engine import hedging_engine

router = APIRouter()


# Approximate current ETF prices (will be updated with real data when yfinance is available)
DEFAULT_ETF_PRICES = {
    "UGA": 58.0,
    "USO": 72.0,
    "BNO": 30.0,
    "UNL": 8.0,
}


async def _get_etf_prices() -> dict:
    try:
        import yfinance as yf
        prices = {}
        for ticker in ["UGA", "USO", "BNO", "UNL"]:
            data = yf.Ticker(ticker)
            hist = data.history(period="1d")
            if not hist.empty:
                prices[ticker] = round(float(hist["Close"].iloc[-1]), 2)
            else:
                prices[ticker] = DEFAULT_ETF_PRICES[ticker]
        return prices
    except Exception:
        return DEFAULT_ETF_PRICES.copy()


@router.post("/calculate", response_model=HedgePositionResponse)
async def calculate_hedge(data: HedgeCalculateRequest, db: Session = Depends(get_db)):
    fuel_price = data.current_fuel_price
    if fuel_price is None:
        fuel_price = await eia_service.get_current_price(data.fuel_type, "NUS", db) or 3.50

    etf_price = data.current_etf_price
    if etf_price is None:
        prices = await _get_etf_prices()
        etf_price = prices.get(data.product_ticker, 50.0)

    position = hedging_engine.calculate_hedge_position(
        monthly_gallons=data.monthly_gallons,
        fuel_type=data.fuel_type,
        product_ticker=data.product_ticker,
        hedge_ratio=data.hedge_ratio,
        current_fuel_price=fuel_price,
        current_etf_price=etf_price,
    )
    return position


@router.get("/recommend/{company_id}")
async def recommend_strategies(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Determine fuel type and gallons
    if company.fuel_type == "gasoline":
        fuel_type = "gasoline"
        monthly_gallons = company.monthly_gallons_gasoline or 0
    elif company.fuel_type == "diesel":
        fuel_type = "diesel"
        monthly_gallons = company.monthly_gallons_diesel or 0
    else:  # both
        fuel_type = "gasoline"  # primary
        monthly_gallons = (company.monthly_gallons_gasoline or 0) + (company.monthly_gallons_diesel or 0)

    fuel_price = await eia_service.get_current_price(fuel_type, company.padd_region, db) or 3.50
    etf_prices = await _get_etf_prices()

    recommendations = hedging_engine.recommend_strategy(
        fuel_type=fuel_type,
        monthly_gallons=monthly_gallons,
        current_fuel_price=fuel_price,
        current_etf_prices=etf_prices,
    )

    return {
        "company_id": company_id,
        "company_name": company.name,
        "fuel_type": fuel_type,
        "monthly_gallons": monthly_gallons,
        "current_fuel_price": fuel_price,
        "recommendations": recommendations,
    }


@router.get("/scenarios/{company_id}")
async def get_scenarios(
    company_id: int,
    hedge_ratio: float = Query(default=0.5, ge=0.0, le=1.0),
    product_ticker: str = Query(default="UGA"),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.fuel_type == "diesel":
        fuel_type = "diesel"
        monthly_gallons = company.monthly_gallons_diesel or 0
    else:
        fuel_type = "gasoline"
        monthly_gallons = company.monthly_gallons_gasoline or 0

    fuel_price = await eia_service.get_current_price(fuel_type, company.padd_region, db) or 3.50
    etf_prices = await _get_etf_prices()
    etf_price = etf_prices.get(product_ticker, 50.0)

    position = hedging_engine.calculate_hedge_position(
        monthly_gallons=monthly_gallons,
        fuel_type=fuel_type,
        product_ticker=product_ticker,
        hedge_ratio=hedge_ratio,
        current_fuel_price=fuel_price,
        current_etf_price=etf_price,
    )

    scenarios = hedging_engine.scenario_analysis(
        monthly_gallons=monthly_gallons,
        hedge_position=position,
        current_fuel_price=fuel_price,
    )

    return {
        "company_id": company_id,
        "hedge_position": position,
        "scenarios": scenarios,
    }


@router.get("/backtest/{company_id}")
async def get_backtest(
    company_id: int,
    years: int = Query(default=3, ge=1, le=5),
    hedge_ratio: float = Query(default=0.5, ge=0.0, le=1.0),
    product_ticker: str = Query(default="UGA"),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.fuel_type == "diesel":
        fuel_type = "diesel"
        monthly_gallons = company.monthly_gallons_diesel or 0
    else:
        fuel_type = "gasoline"
        monthly_gallons = company.monthly_gallons_gasoline or 0

    # Get fuel price history from EIA
    fuel_prices = await eia_service.get_price_history(fuel_type, company.padd_region, years, db)

    # Get ETF price history
    etf_prices = []
    try:
        import yfinance as yf
        data = yf.Ticker(product_ticker)
        hist = data.history(period=f"{years}y")
        # Resample to weekly to match EIA data
        weekly = hist["Close"].resample("W").last().dropna()
        for dt, price in weekly.items():
            etf_prices.append({"period": dt.strftime("%Y-%m-%d"), "value": float(price)})
    except Exception:
        # Fallback: generate synthetic ETF prices based on fuel price movements
        if fuel_prices:
            base_price = DEFAULT_ETF_PRICES.get(product_ticker, 50.0)
            correlation = hedging_engine.CORRELATION.get(fuel_type, {}).get(product_ticker, 0.80)
            first_fuel = fuel_prices[0]["value"]
            for fp in fuel_prices:
                fuel_change = (fp["value"] - first_fuel) / first_fuel
                etf_change = fuel_change * correlation
                etf_prices.append({
                    "period": fp["period"],
                    "value": round(base_price * (1 + etf_change), 2),
                })

    correlation = hedging_engine.CORRELATION.get(fuel_type, {}).get(product_ticker, 0.80)

    result = hedging_engine.historical_backtest(
        monthly_gallons=monthly_gallons,
        fuel_prices=fuel_prices,
        etf_prices=etf_prices,
        hedge_ratio=hedge_ratio,
        correlation=correlation,
    )

    return {
        "company_id": company_id,
        "product_ticker": product_ticker,
        "hedge_ratio": hedge_ratio,
        "years": years,
        **result,
    }


@router.post("/strategies", response_model=HedgingPlanResponse)
def create_strategy(data: HedgingPlanCreate, db: Session = Depends(get_db)):
    plan = HedgingPlan(
        company_id=data.company_id,
        plan_name=data.plan_name,
        fuel_type=data.fuel_type,
        target_gallons=data.target_gallons,
        hedge_instrument=data.hedge_instrument,
        hedge_ratio=data.hedge_ratio,
        notional_value=data.notional_value,
        etf_shares=data.etf_shares,
        entry_price=data.entry_price,
        correlation=data.correlation,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/strategies/{company_id}", response_model=list[HedgingPlanResponse])
def list_strategies(company_id: int, db: Session = Depends(get_db)):
    return (
        db.query(HedgingPlan)
        .filter(HedgingPlan.company_id == company_id)
        .order_by(HedgingPlan.created_at.desc())
        .all()
    )


@router.put("/strategies/{plan_id}")
def update_strategy_status(plan_id: int, status: str, db: Session = Depends(get_db)):
    plan = db.query(HedgingPlan).filter(HedgingPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Strategy not found")
    plan.status = status
    db.commit()
    return {"id": plan_id, "status": status}
