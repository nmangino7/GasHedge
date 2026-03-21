import os
import httpx
from datetime import datetime, date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.company import PriceCache
import numpy as np


class EIAService:
    BASE_URL = "https://api.eia.gov/v2/petroleum/pri/gnd/data/"

    REGION_MAP = {
        "US": "NUS",
        "East Coast": "R10",
        "Midwest": "R20",
        "Gulf Coast": "R30",
        "Rocky Mountain": "R40",
        "West Coast": "R50",
        "R10": "R10",
        "R20": "R20",
        "R30": "R30",
        "R40": "R40",
        "R50": "R50",
        "NUS": "NUS",
    }

    PRODUCT_MAP = {
        "gasoline": "EPM0",
        "diesel": "EPD2D",
    }

    REGION_LABELS = {
        "NUS": "U.S. Average",
        "R10": "East Coast (PADD 1)",
        "R20": "Midwest (PADD 2)",
        "R30": "Gulf Coast (PADD 3)",
        "R40": "Rocky Mountain (PADD 4)",
        "R50": "West Coast (PADD 5)",
    }

    def __init__(self):
        self.api_key = os.getenv("EIA_API_KEY", "")

    async def fetch_prices(
        self,
        fuel_type: str,
        region: str,
        start_date: str,
        end_date: str,
        db: Optional[Session] = None,
    ) -> list[dict]:
        duoarea = self.REGION_MAP.get(region, "NUS")
        product = self.PRODUCT_MAP.get(fuel_type, "EPM0")
        series_key = f"{fuel_type}_{duoarea}_weekly"

        # Check cache first
        if db:
            cached = self._get_cached_prices(db, series_key, start_date, end_date)
            if cached:
                return cached

        # If no API key configured, return empty (callers use fallback prices)
        if not self.api_key or self.api_key == "your_eia_api_key_here":
            return []

        params = {
            "api_key": self.api_key,
            "frequency": "weekly",
            "data[0]": "value",
            "facets[duoarea][]": duoarea,
            "facets[product][]": product,
            "start": start_date,
            "end": end_date,
            "sort[0][column]": "period",
            "sort[0][direction]": "asc",
            "length": 5000,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()

            prices = []
            for row in data.get("response", {}).get("data", []):
                if row.get("value") is not None:
                    prices.append({
                        "period": row["period"],
                        "value": float(row["value"]),
                    })

            # Cache the results
            if db and prices:
                self._cache_prices(db, series_key, prices)

            return prices
        except Exception as e:
            # Fall back to cached data on API failure
            if db:
                cached = self._get_cached_prices(db, series_key, start_date, end_date)
                if cached:
                    return cached
            return []

    async def get_current_price(
        self, fuel_type: str, region: str, db: Optional[Session] = None
    ) -> Optional[float]:
        end = date.today().isoformat()
        start = (date.today() - timedelta(days=30)).isoformat()
        prices = await self.fetch_prices(fuel_type, region, start, end, db)
        if prices:
            return prices[-1]["value"]
        return None

    async def get_price_history(
        self, fuel_type: str, region: str, years: int = 5, db: Optional[Session] = None
    ) -> list[dict]:
        end = date.today().isoformat()
        start = (date.today() - timedelta(days=years * 365)).isoformat()
        return await self.fetch_prices(fuel_type, region, start, end, db)

    async def get_all_current_prices(self, db: Optional[Session] = None) -> list[dict]:
        results = []
        for fuel_type in ["gasoline", "diesel"]:
            for region_code in ["NUS", "R10", "R20", "R30", "R40", "R50"]:
                try:
                    price = await self.get_current_price(fuel_type, region_code, db)
                    if price:
                        # Get previous week for change calculation
                        end = date.today().isoformat()
                        start = (date.today() - timedelta(days=30)).isoformat()
                        history = await self.fetch_prices(fuel_type, region_code, start, end, db)

                        week_change = 0.0
                        week_change_pct = 0.0
                        if len(history) >= 2:
                            week_change = history[-1]["value"] - history[-2]["value"]
                            if history[-2]["value"] > 0:
                                week_change_pct = (week_change / history[-2]["value"]) * 100

                        results.append({
                            "fuel_type": fuel_type,
                            "region": region_code,
                            "region_label": self.REGION_LABELS.get(region_code, region_code),
                            "price_per_gallon": round(price, 3),
                            "week_change": round(week_change, 3),
                            "week_change_pct": round(week_change_pct, 2),
                        })
                except Exception:
                    continue
        return results

    def calculate_volatility(self, prices: list[dict], window: int = 52) -> dict:
        values = [p["value"] for p in prices]
        if len(values) < 2:
            return {
                "annualized_volatility": 0,
                "weekly_std_dev": 0,
                "price_range_52w": {"min": 0, "max": 0},
                "current_vs_52w_avg": 0,
                "trend": "stable",
            }

        recent = values[-window:] if len(values) >= window else values

        # Weekly returns
        returns = []
        for i in range(1, len(recent)):
            if recent[i - 1] > 0:
                returns.append((recent[i] - recent[i - 1]) / recent[i - 1])

        if not returns:
            return {
                "annualized_volatility": 0,
                "weekly_std_dev": 0,
                "price_range_52w": {"min": min(recent), "max": max(recent)},
                "current_vs_52w_avg": 0,
                "trend": "stable",
            }

        weekly_std = float(np.std(returns))
        annualized_vol = weekly_std * np.sqrt(52)
        avg_price = float(np.mean(recent))
        current = recent[-1]

        # Trend: compare 4-week avg to 13-week avg
        ma4 = float(np.mean(recent[-4:])) if len(recent) >= 4 else current
        ma13 = float(np.mean(recent[-13:])) if len(recent) >= 13 else current

        if ma4 > ma13 * 1.02:
            trend = "rising"
        elif ma4 < ma13 * 0.98:
            trend = "falling"
        else:
            trend = "stable"

        return {
            "annualized_volatility": round(annualized_vol, 4),
            "weekly_std_dev": round(weekly_std, 4),
            "price_range_52w": {
                "min": round(min(recent), 3),
                "max": round(max(recent), 3),
            },
            "current_vs_52w_avg": round((current - avg_price) / avg_price * 100, 2),
            "trend": trend,
        }

    def _get_cached_prices(
        self, db: Session, series_key: str, start: str, end: str
    ) -> list[dict]:
        cached = (
            db.query(PriceCache)
            .filter(
                PriceCache.source == "eia",
                PriceCache.series_key == series_key,
                PriceCache.date >= start,
                PriceCache.date <= end,
            )
            .order_by(PriceCache.date.asc())
            .all()
        )
        if cached:
            return [{"period": c.date.isoformat(), "value": c.value} for c in cached]
        return []

    def _cache_prices(self, db: Session, series_key: str, prices: list[dict]):
        for p in prices:
            existing = (
                db.query(PriceCache)
                .filter(
                    PriceCache.source == "eia",
                    PriceCache.series_key == series_key,
                    PriceCache.date == p["period"],
                )
                .first()
            )
            if not existing:
                cache_entry = PriceCache(
                    source="eia",
                    series_key=series_key,
                    date=date.fromisoformat(p["period"]),
                    value=p["value"],
                    unit="dollars_per_gallon",
                )
                db.add(cache_entry)
        try:
            db.commit()
        except Exception:
            db.rollback()


eia_service = EIAService()
