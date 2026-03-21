import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.company import Company
from app.schemas import CompanyCreate, CompanyUpdate, CompanyResponse, ExposureResponse, BenchmarkResponse
from app.services.eia_service import eia_service
from app.services.hedging_engine import hedging_engine, _load_benchmarks

router = APIRouter()

STATE_TO_PADD = _load_benchmarks().get("state_to_padd", {})


def _get_padd(state: str) -> str:
    return STATE_TO_PADD.get(state.upper(), "NUS")


@router.post("", response_model=CompanyResponse)
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    padd = _get_padd(data.address_state)
    company = Company(
        name=data.name,
        company_type=data.company_type,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        address_state=data.address_state.upper(),
        padd_region=padd,
        fleet_size=data.fleet_size,
        vehicle_types=data.vehicle_types,
        fuel_type=data.fuel_type,
        monthly_gallons_gasoline=data.monthly_gallons_gasoline,
        monthly_gallons_diesel=data.monthly_gallons_diesel,
        annual_revenue=data.annual_revenue,
        notes=data.notes,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("", response_model=list[CompanyResponse])
def list_companies(
    status: Optional[str] = None,
    company_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if status:
        query = query.filter(Company.status == status)
    if company_type:
        query = query.filter(Company.company_type == company_type)
    return query.order_by(Company.created_at.desc()).all()


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, data: CompanyUpdate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = data.model_dump(exclude_unset=True)
    if "address_state" in update_data:
        update_data["padd_region"] = _get_padd(update_data["address_state"])

    for key, value in update_data.items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.status = "archived"
    db.commit()
    return {"status": "archived"}


@router.get("/{company_id}/exposure", response_model=ExposureResponse)
async def get_exposure(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    gas_price = await eia_service.get_current_price("gasoline", company.padd_region, db) or 3.50
    diesel_price = await eia_service.get_current_price("diesel", company.padd_region, db) or 3.90

    gas_gallons = company.monthly_gallons_gasoline or 0
    diesel_gallons = company.monthly_gallons_diesel or 0

    exposure = hedging_engine.calculate_exposure(
        monthly_gallons_gasoline=gas_gallons,
        monthly_gallons_diesel=diesel_gallons,
        current_price_gasoline=gas_price,
        current_price_diesel=diesel_price,
        annual_revenue=company.annual_revenue,
    )

    return ExposureResponse(
        company_id=company.id,
        company_name=company.name,
        fuel_type=company.fuel_type,
        current_price_gasoline=gas_price,
        current_price_diesel=diesel_price,
        **exposure,
    )


@router.get("/{company_id}/benchmark", response_model=BenchmarkResponse)
def get_benchmark(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    benchmarks = _load_benchmarks()
    profile = benchmarks["industry_profiles"].get(company.company_type)
    if not profile:
        raise HTTPException(status_code=400, detail=f"No benchmark data for type: {company.company_type}")

    monthly_gallons = (company.monthly_gallons_gasoline or 0) + (company.monthly_gallons_diesel or 0)
    per_unit = monthly_gallons / company.fleet_size if company.fleet_size > 0 else 0

    avg_per_unit = profile["gallons_per_unit_per_month"]["mid"]
    low_per_unit = profile["gallons_per_unit_per_month"]["low"]
    high_per_unit = profile["gallons_per_unit_per_month"]["high"]

    if per_unit < low_per_unit * 0.8:
        comparison = "below_average"
    elif per_unit > high_per_unit * 1.2:
        comparison = "above_average"
    else:
        comparison = "average"

    company_fuel_pct = None
    if company.annual_revenue and company.annual_revenue > 0:
        annual_fuel = monthly_gallons * 3.50 * 12  # rough estimate
        company_fuel_pct = round(annual_fuel / company.annual_revenue * 100, 2)

    return BenchmarkResponse(
        company_id=company.id,
        company_type=company.company_type,
        company_monthly_gallons=monthly_gallons,
        industry_avg_monthly_gallons=avg_per_unit * company.fleet_size,
        industry_range={
            "low": low_per_unit * company.fleet_size,
            "mid": avg_per_unit * company.fleet_size,
            "high": high_per_unit * company.fleet_size,
        },
        company_fuel_pct_revenue=company_fuel_pct,
        industry_avg_fuel_pct_revenue=profile["fuel_pct_revenue"]["mid"] * 100,
        comparison=comparison,
    )
