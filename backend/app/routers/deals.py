from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models.company import Company, Deal
from app.schemas import DealCreate, DealUpdate, DealResponse, RevenueResponse, PipelineResponse
from app.services.hedging_engine import hedging_engine

router = APIRouter()


@router.post("", response_model=DealResponse)
def create_deal(data: DealCreate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == data.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    annual_revenue = hedging_engine.calculate_deal_revenue(
        fee_structure=data.fee_structure,
        fee_amount=data.fee_amount,
        aum_value=data.aum_value,
    )

    deal = Deal(
        company_id=data.company_id,
        hedging_plan_id=data.hedging_plan_id,
        fee_structure=data.fee_structure,
        fee_amount=data.fee_amount,
        aum_value=data.aum_value,
        annual_fee_revenue=annual_revenue,
        notes=data.notes,
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)

    return DealResponse(
        **{c.name: getattr(deal, c.name) for c in deal.__table__.columns},
        company_name=company.name,
    )


@router.get("", response_model=list[DealResponse])
def list_deals(
    status: Optional[str] = None,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Deal, Company.name).join(Company, Deal.company_id == Company.id)
    if status:
        query = query.filter(Deal.status == status)
    if company_id:
        query = query.filter(Deal.company_id == company_id)

    results = []
    for deal, company_name in query.order_by(Deal.created_at.desc()).all():
        results.append(DealResponse(
            **{c.name: getattr(deal, c.name) for c in deal.__table__.columns},
            company_name=company_name,
        ))
    return results


@router.get("/revenue", response_model=RevenueResponse)
def get_revenue(db: Session = Depends(get_db)):
    # Active deals (won/active/signed)
    active_statuses = ["signed", "active"]
    active_deals = db.query(Deal).filter(Deal.status.in_(active_statuses)).all()

    total_annual = sum(d.annual_fee_revenue for d in active_deals)
    total_monthly = total_annual / 12

    # Revenue by type
    revenue_by_type = {}
    for deal in active_deals:
        key = deal.fee_structure
        if key not in revenue_by_type:
            revenue_by_type[key] = 0
        revenue_by_type[key] += deal.annual_fee_revenue

    # Pipeline value (non-lost, non-cancelled)
    pipeline_statuses = ["prospect", "proposed", "signed", "active"]
    pipeline_deals = db.query(Deal).filter(Deal.status.in_(pipeline_statuses)).all()
    pipeline_value = sum(d.annual_fee_revenue for d in pipeline_deals)

    # Top clients
    top_clients = []
    client_revenue = {}
    for deal in active_deals:
        if deal.company_id not in client_revenue:
            company = db.query(Company).filter(Company.id == deal.company_id).first()
            client_revenue[deal.company_id] = {
                "company_id": deal.company_id,
                "company_name": company.name if company else "Unknown",
                "annual_revenue": 0,
                "deal_count": 0,
            }
        client_revenue[deal.company_id]["annual_revenue"] += deal.annual_fee_revenue
        client_revenue[deal.company_id]["deal_count"] += 1

    top_clients = sorted(client_revenue.values(), key=lambda x: x["annual_revenue"], reverse=True)[:10]

    return RevenueResponse(
        total_annual_revenue=round(total_annual, 2),
        total_monthly_revenue=round(total_monthly, 2),
        active_deals=len(active_deals),
        pipeline_value=round(pipeline_value, 2),
        revenue_by_type=revenue_by_type,
        top_clients=top_clients,
    )


@router.get("/pipeline", response_model=PipelineResponse)
def get_pipeline(db: Session = Depends(get_db)):
    all_deals = db.query(Deal, Company.name).join(Company, Deal.company_id == Company.id).all()

    stages = {}
    for deal, company_name in all_deals:
        if deal.status not in stages:
            stages[deal.status] = []
        stages[deal.status].append({
            "id": deal.id,
            "company_id": deal.company_id,
            "company_name": company_name,
            "fee_structure": deal.fee_structure,
            "fee_amount": deal.fee_amount,
            "annual_fee_revenue": deal.annual_fee_revenue,
            "status": deal.status,
            "created_at": deal.created_at.isoformat() if deal.created_at else None,
        })

    return PipelineResponse(stages=stages)


@router.get("/{deal_id}", response_model=DealResponse)
def get_deal(deal_id: int, db: Session = Depends(get_db)):
    result = (
        db.query(Deal, Company.name)
        .join(Company, Deal.company_id == Company.id)
        .filter(Deal.id == deal_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Deal not found")
    deal, company_name = result
    return DealResponse(
        **{c.name: getattr(deal, c.name) for c in deal.__table__.columns},
        company_name=company_name,
    )


@router.put("/{deal_id}", response_model=DealResponse)
def update_deal(deal_id: int, data: DealUpdate, db: Session = Depends(get_db)):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    update_data = data.model_dump(exclude_unset=True)

    # Recalculate revenue if fee structure changes
    fee_structure = update_data.get("fee_structure", deal.fee_structure)
    fee_amount = update_data.get("fee_amount", deal.fee_amount)
    aum_value = update_data.get("aum_value", deal.aum_value)

    if any(k in update_data for k in ["fee_structure", "fee_amount", "aum_value"]):
        update_data["annual_fee_revenue"] = hedging_engine.calculate_deal_revenue(
            fee_structure=fee_structure,
            fee_amount=fee_amount,
            aum_value=aum_value,
        )

    for key, value in update_data.items():
        setattr(deal, key, value)

    db.commit()
    db.refresh(deal)

    company = db.query(Company).filter(Company.id == deal.company_id).first()
    return DealResponse(
        **{c.name: getattr(deal, c.name) for c in deal.__table__.columns},
        company_name=company.name if company else "Unknown",
    )
