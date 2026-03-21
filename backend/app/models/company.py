from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    company_type: Mapped[str] = mapped_column(String(50), nullable=False)  # landscaping, trucking_local, trucking_longhaul, delivery, other
    contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address_state: Mapped[str] = mapped_column(String(2), nullable=False)
    padd_region: Mapped[str] = mapped_column(String(10), nullable=False)  # R10, R20, R30, R40, R50
    fleet_size: Mapped[int] = mapped_column(Integer, nullable=False)
    vehicle_types: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON list
    fuel_type: Mapped[str] = mapped_column(String(20), nullable=False)  # gasoline, diesel, both
    monthly_gallons_gasoline: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_gallons_diesel: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    annual_revenue: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="prospect")  # prospect, active, churned
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hedging_plans: Mapped[list["HedgingPlan"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    deals: Mapped[list["Deal"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class HedgingPlan(Base):
    __tablename__ = "hedging_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id"), nullable=False)
    plan_name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fuel_type: Mapped[str] = mapped_column(String(20), nullable=False)  # gasoline, diesel
    target_gallons: Mapped[float] = mapped_column(Float, nullable=False)
    hedge_instrument: Mapped[str] = mapped_column(String(10), nullable=False)  # UGA, USO, BNO, UNL
    hedge_ratio: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 to 1.0
    notional_value: Mapped[float] = mapped_column(Float, nullable=False)
    etf_shares: Mapped[float] = mapped_column(Float, nullable=False)
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    correlation: Mapped[float] = mapped_column(Float, nullable=False, default=0.85)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="proposed")  # proposed, active, closed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    company: Mapped["Company"] = relationship(back_populates="hedging_plans")
    deal: Mapped[Optional["Deal"]] = relationship(back_populates="hedging_plan", uselist=False)


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id"), nullable=False)
    hedging_plan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("hedging_plans.id"), nullable=True)
    fee_structure: Mapped[str] = mapped_column(String(20), nullable=False)  # flat, aum_percentage, subscription
    fee_amount: Mapped[float] = mapped_column(Float, nullable=False)  # dollar amount or percentage
    aum_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    annual_fee_revenue: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="prospect")  # prospect, proposed, signed, active, cancelled
    signed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company: Mapped["Company"] = relationship(back_populates="deals")
    hedging_plan: Mapped[Optional["HedgingPlan"]] = relationship(back_populates="deal")


class PriceCache(Base):
    __tablename__ = "price_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(10), nullable=False)  # eia, etf
    series_key: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default="dollars_per_gallon")
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
