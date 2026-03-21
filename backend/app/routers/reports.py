import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.company import Company
from app.schemas import ReportGenerateRequest
from app.services.eia_service import eia_service
from app.services.hedging_engine import hedging_engine
from app.services.claude_service import claude_service
from app.services.report_service import report_service

router = APIRouter()


@router.post("/generate/{company_id}")
async def generate_report(company_id: int, data: ReportGenerateRequest, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get fuel prices
    if company.fuel_type == "diesel":
        fuel_type = "diesel"
        monthly_gallons = company.monthly_gallons_diesel or 0
    else:
        fuel_type = "gasoline"
        monthly_gallons = company.monthly_gallons_gasoline or 0

    gas_price = await eia_service.get_current_price("gasoline", company.padd_region, db) or 3.50
    diesel_price = await eia_service.get_current_price("diesel", company.padd_region, db) or 3.90

    # Calculate exposure
    exposure = hedging_engine.calculate_exposure(
        monthly_gallons_gasoline=company.monthly_gallons_gasoline or 0,
        monthly_gallons_diesel=company.monthly_gallons_diesel or 0,
        current_price_gasoline=gas_price,
        current_price_diesel=diesel_price,
        annual_revenue=company.annual_revenue,
    )

    # Calculate hedge position
    fuel_price = gas_price if fuel_type == "gasoline" else diesel_price

    # Get ETF price
    try:
        import yfinance as yf
        ticker_data = yf.Ticker(data.product_ticker)
        hist = ticker_data.history(period="1d")
        etf_price = float(hist["Close"].iloc[-1]) if not hist.empty else 50.0
    except Exception:
        etf_price = {"UGA": 58.0, "USO": 72.0, "BNO": 30.0, "UNL": 8.0}.get(data.product_ticker, 50.0)

    position = hedging_engine.calculate_hedge_position(
        monthly_gallons=monthly_gallons,
        fuel_type=fuel_type,
        product_ticker=data.product_ticker,
        hedge_ratio=data.hedge_ratio,
        current_fuel_price=fuel_price,
        current_etf_price=etf_price,
    )

    # Scenario analysis
    scenarios = hedging_engine.scenario_analysis(
        monthly_gallons=monthly_gallons,
        hedge_position=position,
        current_fuel_price=fuel_price,
    )

    # Get backtest
    fuel_prices = await eia_service.get_price_history(fuel_type, company.padd_region, 3, db)
    etf_prices = []
    try:
        import yfinance as yf
        data_yf = yf.Ticker(data.product_ticker)
        hist = data_yf.history(period="3y")
        weekly = hist["Close"].resample("W").last().dropna()
        for dt, price in weekly.items():
            etf_prices.append({"period": dt.strftime("%Y-%m-%d"), "value": float(price)})
    except Exception:
        pass

    correlation = hedging_engine.CORRELATION.get(fuel_type, {}).get(data.product_ticker, 0.80)
    backtest = hedging_engine.historical_backtest(
        monthly_gallons=monthly_gallons,
        fuel_prices=fuel_prices,
        etf_prices=etf_prices,
        hedge_ratio=data.hedge_ratio,
        correlation=correlation,
    )

    # Generate AI narrative
    company_dict = {
        "name": company.name,
        "company_type": company.company_type,
        "fleet_size": company.fleet_size,
        "fuel_type": company.fuel_type,
        "padd_region": company.padd_region,
        "contact_name": company.contact_name,
    }

    ai_narrative = await claude_service.generate_report_narrative(
        company=company_dict,
        exposure=exposure,
        strategy={"position": position, "hedge_ratio": data.hedge_ratio, "ticker": data.product_ticker},
        scenarios=scenarios,
    )

    # Generate PDF
    strategy_dict = {"position": position}
    filename = report_service.generate_report(
        company=company_dict,
        exposure=exposure,
        strategy=strategy_dict,
        scenarios=scenarios,
        backtest=backtest,
        ai_narrative=ai_narrative,
    )

    return {
        "filename": filename,
        "download_url": f"/api/reports/download/{filename}",
    }


@router.get("/download/{filename}")
def download_report(filename: str):
    filepath = os.path.join("reports", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(filepath, media_type="application/pdf", filename=filename)
