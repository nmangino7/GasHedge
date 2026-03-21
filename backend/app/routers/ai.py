from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.company import Company
from app.schemas import AIQuestionRequest, AIResponse
from app.services.eia_service import eia_service
from app.services.hedging_engine import hedging_engine
from app.services.claude_service import claude_service

router = APIRouter()


@router.post("/recommend/{company_id}", response_model=AIResponse)
async def ai_recommend(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get fuel data
    if company.fuel_type == "diesel":
        fuel_type = "diesel"
        monthly_gallons = company.monthly_gallons_diesel or 0
    else:
        fuel_type = "gasoline"
        monthly_gallons = company.monthly_gallons_gasoline or 0

    gas_price = await eia_service.get_current_price("gasoline", company.padd_region, db) or 3.50
    diesel_price = await eia_service.get_current_price("diesel", company.padd_region, db) or 3.90
    fuel_price = gas_price if fuel_type == "gasoline" else diesel_price

    # Calculate exposure
    exposure = hedging_engine.calculate_exposure(
        monthly_gallons_gasoline=company.monthly_gallons_gasoline or 0,
        monthly_gallons_diesel=company.monthly_gallons_diesel or 0,
        current_price_gasoline=gas_price,
        current_price_diesel=diesel_price,
        annual_revenue=company.annual_revenue,
    )

    # Get recommendations
    etf_prices = {"UGA": 58.0, "USO": 72.0, "BNO": 30.0, "UNL": 8.0}
    strategies = hedging_engine.recommend_strategy(
        fuel_type=fuel_type,
        monthly_gallons=monthly_gallons,
        current_fuel_price=fuel_price,
        current_etf_prices=etf_prices,
    )

    # Get volatility for market context
    prices = await eia_service.get_price_history(fuel_type, company.padd_region, 1, db)
    volatility = eia_service.calculate_volatility(prices)

    company_dict = {
        "name": company.name,
        "company_type": company.company_type,
        "fleet_size": company.fleet_size,
        "fuel_type": company.fuel_type,
        "padd_region": company.padd_region,
    }

    result = await claude_service.generate_hedge_recommendation(
        company=company_dict,
        exposure=exposure,
        strategies=strategies,
        market_context={"volatility": volatility, "current_price": fuel_price},
    )

    return AIResponse(**result)


@router.post("/ask", response_model=AIResponse)
async def ai_ask(data: AIQuestionRequest, db: Session = Depends(get_db)):
    company_context = None
    if data.company_id:
        company = db.query(Company).filter(Company.id == data.company_id).first()
        if company:
            gas_price = await eia_service.get_current_price("gasoline", company.padd_region, db) or 3.50
            diesel_price = await eia_service.get_current_price("diesel", company.padd_region, db) or 3.90
            company_context = {
                "name": company.name,
                "company_type": company.company_type,
                "fleet_size": company.fleet_size,
                "fuel_type": company.fuel_type,
                "padd_region": company.padd_region,
                "monthly_gallons_gasoline": company.monthly_gallons_gasoline,
                "monthly_gallons_diesel": company.monthly_gallons_diesel,
                "annual_revenue": company.annual_revenue,
                "current_gas_price": gas_price,
                "current_diesel_price": diesel_price,
            }

    result = await claude_service.answer_question(data.question, company_context)
    return AIResponse(**result)


@router.get("/market-outlook", response_model=AIResponse)
async def market_outlook(db: Session = Depends(get_db)):
    # Get current prices for context
    gas_price = await eia_service.get_current_price("gasoline", "NUS", db) or 3.50
    diesel_price = await eia_service.get_current_price("diesel", "NUS", db) or 3.90

    gas_history = await eia_service.get_price_history("gasoline", "NUS", 1, db)
    diesel_history = await eia_service.get_price_history("diesel", "NUS", 1, db)

    gas_vol = eia_service.calculate_volatility(gas_history)
    diesel_vol = eia_service.calculate_volatility(diesel_history)

    price_data = {
        "gasoline": {"current": gas_price, "trend": gas_vol.get("trend", "stable")},
        "diesel": {"current": diesel_price, "trend": diesel_vol.get("trend", "stable")},
    }

    result = await claude_service.generate_market_outlook(
        price_data=price_data,
        volatility={"gasoline": gas_vol, "diesel": diesel_vol},
    )
    return AIResponse(**result)
