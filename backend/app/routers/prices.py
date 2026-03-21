from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.services.eia_service import eia_service
from app.schemas import CurrentPriceResponse, PriceHistoryResponse, VolatilityResponse

router = APIRouter()


@router.get("/current", response_model=CurrentPriceResponse)
async def get_current_prices(db: Session = Depends(get_db)):
    prices = await eia_service.get_all_current_prices(db)
    return CurrentPriceResponse(
        as_of=date.today().isoformat(),
        prices=prices,
    )


@router.get("/current/{fuel_type}/{region}")
async def get_current_price(fuel_type: str, region: str, db: Session = Depends(get_db)):
    price = await eia_service.get_current_price(fuel_type, region, db)
    if price is None:
        return {"fuel_type": fuel_type, "region": region, "price_per_gallon": None, "error": "No data available"}
    return {
        "fuel_type": fuel_type,
        "region": region,
        "region_label": eia_service.REGION_LABELS.get(region, region),
        "price_per_gallon": round(price, 3),
    }


@router.get("/history/{fuel_type}/{region}", response_model=PriceHistoryResponse)
async def get_price_history(
    fuel_type: str,
    region: str,
    years: int = Query(default=5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    prices = await eia_service.get_price_history(fuel_type, region, years, db)
    return PriceHistoryResponse(
        fuel_type=fuel_type,
        region=region,
        region_label=eia_service.REGION_LABELS.get(region, region),
        period_years=years,
        prices=[{"period": p["period"], "value": p["value"]} for p in prices],
    )


@router.get("/volatility/{fuel_type}/{region}", response_model=VolatilityResponse)
async def get_volatility(fuel_type: str, region: str, db: Session = Depends(get_db)):
    prices = await eia_service.get_price_history(fuel_type, region, years=2, db=db)
    vol = eia_service.calculate_volatility(prices)
    return VolatilityResponse(
        fuel_type=fuel_type,
        region=region,
        **vol,
    )


@router.get("/comparison")
async def get_comparison(fuel_type: str = "gasoline", db: Session = Depends(get_db)):
    results = []
    for region_code in ["NUS", "R10", "R20", "R30", "R40", "R50"]:
        price = await eia_service.get_current_price(fuel_type, region_code, db)
        if price:
            results.append({
                "region": region_code,
                "region_label": eia_service.REGION_LABELS.get(region_code, region_code),
                "price_per_gallon": round(price, 3),
            })
    return {"fuel_type": fuel_type, "regions": results}
