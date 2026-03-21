import json
import os
from datetime import date, timedelta
from typing import Optional

import numpy as np

BENCHMARKS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmarks.json")


def _load_benchmarks():
    with open(BENCHMARKS_PATH, "r") as f:
        return json.load(f)


class HedgingEngine:
    # Approximate correlations between ETF returns and retail fuel price changes
    CORRELATION = {
        "gasoline": {"UGA": 0.88, "USO": 0.78, "BNO": 0.75},
        "diesel": {"USO": 0.80, "BNO": 0.78, "UGA": 0.65},
    }

    # ETF expense ratios
    EXPENSE_RATIOS = {
        "UGA": 0.0097,
        "USO": 0.0081,
        "BNO": 0.0090,
        "UNL": 0.0090,
    }

    ETF_NAMES = {
        "UGA": "United States Gasoline Fund",
        "USO": "United States Oil Fund",
        "BNO": "United States Brent Oil Fund",
        "UNL": "United States 12 Month Natural Gas Fund",
    }

    def calculate_hedge_position(
        self,
        monthly_gallons: float,
        fuel_type: str,
        product_ticker: str,
        hedge_ratio: float,
        current_fuel_price: float,
        current_etf_price: float,
    ) -> dict:
        annual_gallons = monthly_gallons * 12
        gallons_to_hedge = annual_gallons * hedge_ratio
        annual_fuel_cost = gallons_to_hedge * current_fuel_price

        correlation = self.CORRELATION.get(fuel_type, {}).get(product_ticker, 0.80)
        adjusted_notional = annual_fuel_cost / correlation

        shares_needed = adjusted_notional / current_etf_price if current_etf_price > 0 else 0

        expense_ratio = self.EXPENSE_RATIOS.get(product_ticker, 0.01)
        annual_expense_drag = adjusted_notional * expense_ratio

        return {
            "product_ticker": product_ticker,
            "product_name": self.ETF_NAMES.get(product_ticker, product_ticker),
            "hedge_ratio": hedge_ratio,
            "gallons_hedged": gallons_to_hedge,
            "dollar_notional": round(adjusted_notional, 2),
            "shares_needed": round(shares_needed),
            "annual_expense_cost": round(annual_expense_drag, 2),
            "correlation_to_retail": correlation,
            "effective_hedge_ratio": round(hedge_ratio * correlation, 3),
            "etf_price": current_etf_price,
        }

    def scenario_analysis(
        self,
        monthly_gallons: float,
        hedge_position: dict,
        current_fuel_price: float,
        price_changes: Optional[list[float]] = None,
    ) -> list[dict]:
        if price_changes is None:
            price_changes = [-0.20, -0.10, 0.0, 0.10, 0.20, 0.40, 0.60]

        results = []
        annual_gallons = monthly_gallons * 12

        for change in price_changes:
            new_price = current_fuel_price * (1 + change)
            unhedged_cost = annual_gallons * new_price
            base_cost = annual_gallons * current_fuel_price

            # ETF gain/loss: fuel goes up X%, ETF goes up ~X% * correlation
            etf_return = change * hedge_position["correlation_to_retail"]
            hedge_pnl = hedge_position["dollar_notional"] * etf_return

            hedged_cost = unhedged_cost - hedge_pnl + hedge_position["annual_expense_cost"]

            savings = unhedged_cost - hedged_cost

            results.append({
                "price_change_pct": change,
                "new_price_per_gallon": round(new_price, 3),
                "unhedged_annual_cost": round(unhedged_cost, 2),
                "hedged_annual_cost": round(hedged_cost, 2),
                "savings": round(savings, 2),
                "savings_pct": round(savings / unhedged_cost * 100, 2) if unhedged_cost > 0 else 0,
            })
        return results

    def recommend_strategy(
        self,
        fuel_type: str,
        monthly_gallons: float,
        current_fuel_price: float,
        current_etf_prices: dict,
    ) -> list[dict]:
        # Select primary and secondary ETFs based on fuel type
        if fuel_type == "gasoline":
            primary_ticker = "UGA"
            secondary_ticker = "USO"
        elif fuel_type == "diesel":
            primary_ticker = "USO"
            secondary_ticker = "BNO"
        else:  # both - use USO as general-purpose
            primary_ticker = "USO"
            secondary_ticker = "UGA"

        tiers = [
            {"tier": "conservative", "ratio": 0.25, "ticker": primary_ticker,
             "rationale": "Covers 25% of fuel consumption. Lowest cost, still provides meaningful protection against large price spikes. Best for companies with thin margins wanting basic protection."},
            {"tier": "moderate", "ratio": 0.50, "ticker": primary_ticker,
             "rationale": "Covers 50% of fuel consumption. Balanced approach — significant protection while keeping half of your fuel budget flexible. Most popular choice for small businesses."},
            {"tier": "aggressive", "ratio": 0.75, "ticker": primary_ticker,
             "rationale": "Covers 75% of fuel consumption. Maximum protection with higher cost. Best for businesses where fuel is a very large portion of operating expenses."},
        ]

        recommendations = []
        for t in tiers:
            etf_price = current_etf_prices.get(t["ticker"], 50.0)
            position = self.calculate_hedge_position(
                monthly_gallons=monthly_gallons,
                fuel_type=fuel_type,
                product_ticker=t["ticker"],
                hedge_ratio=t["ratio"],
                current_fuel_price=current_fuel_price,
                current_etf_price=etf_price,
            )
            recommendations.append({
                "tier": t["tier"],
                "product_ticker": t["ticker"],
                "product_name": self.ETF_NAMES.get(t["ticker"], t["ticker"]),
                "hedge_ratio": t["ratio"],
                "position": position,
                "rationale": t["rationale"],
            })

        return recommendations

    def historical_backtest(
        self,
        monthly_gallons: float,
        fuel_prices: list[dict],
        etf_prices: list[dict],
        hedge_ratio: float,
        correlation: float,
    ) -> dict:
        if not fuel_prices or not etf_prices:
            return {
                "periods": [],
                "total_unhedged_cost": 0,
                "total_hedged_cost": 0,
                "total_savings": 0,
                "savings_pct": 0,
            }

        # Build date-indexed maps
        fuel_map = {p["period"]: p["value"] for p in fuel_prices}
        etf_map = {p["period"]: p["value"] for p in etf_prices}

        # Find overlapping dates
        common_dates = sorted(set(fuel_map.keys()) & set(etf_map.keys()))

        if len(common_dates) < 2:
            return {
                "periods": [],
                "total_unhedged_cost": 0,
                "total_hedged_cost": 0,
                "total_savings": 0,
                "savings_pct": 0,
            }

        weekly_gallons = monthly_gallons / 4.33
        gallons_hedged = weekly_gallons * hedge_ratio

        periods = []
        total_unhedged = 0
        total_hedged = 0
        cumulative_savings = 0

        initial_etf_price = etf_map[common_dates[0]]

        for i in range(1, len(common_dates)):
            d = common_dates[i]
            prev_d = common_dates[i - 1]
            fuel_price = fuel_map[d]
            etf_price = etf_map[d]
            prev_etf = etf_map[prev_d]

            # Unhedged cost for this period
            unhedged_cost = weekly_gallons * fuel_price

            # ETF return this period
            etf_return = (etf_price - prev_etf) / prev_etf if prev_etf > 0 else 0
            hedge_pnl = gallons_hedged * fuel_map[common_dates[0]] * correlation * etf_return

            hedged_cost = unhedged_cost - hedge_pnl
            savings = unhedged_cost - hedged_cost
            cumulative_savings += savings

            total_unhedged += unhedged_cost
            total_hedged += hedged_cost

            periods.append({
                "date": d,
                "fuel_price": round(fuel_price, 3),
                "etf_price": round(etf_price, 2),
                "unhedged_cost": round(unhedged_cost, 2),
                "hedged_cost": round(hedged_cost, 2),
                "period_savings": round(savings, 2),
                "cumulative_savings": round(cumulative_savings, 2),
            })

        total_savings = total_unhedged - total_hedged
        savings_pct = (total_savings / total_unhedged * 100) if total_unhedged > 0 else 0

        return {
            "periods": periods,
            "total_unhedged_cost": round(total_unhedged, 2),
            "total_hedged_cost": round(total_hedged, 2),
            "total_savings": round(total_savings, 2),
            "savings_pct": round(savings_pct, 2),
            "period_count": len(periods),
            "start_date": common_dates[0] if common_dates else None,
            "end_date": common_dates[-1] if common_dates else None,
        }

    def calculate_exposure(
        self,
        monthly_gallons_gasoline: float,
        monthly_gallons_diesel: float,
        current_price_gasoline: float,
        current_price_diesel: float,
        annual_revenue: Optional[float] = None,
    ) -> dict:
        monthly_gas_cost = monthly_gallons_gasoline * current_price_gasoline
        monthly_diesel_cost = monthly_gallons_diesel * current_price_diesel
        monthly_fuel_cost = monthly_gas_cost + monthly_diesel_cost
        annual_fuel_cost = monthly_fuel_cost * 12

        fuel_pct = None
        if annual_revenue and annual_revenue > 0:
            fuel_pct = round(annual_fuel_cost / annual_revenue * 100, 2)

        scenarios = []
        for change_pct in [0.10, 0.20, 0.40, 0.60]:
            shocked_gas = current_price_gasoline * (1 + change_pct)
            shocked_diesel = current_price_diesel * (1 + change_pct)
            shocked_monthly = (monthly_gallons_gasoline * shocked_gas) + (monthly_gallons_diesel * shocked_diesel)
            shocked_annual = shocked_monthly * 12
            additional = shocked_annual - annual_fuel_cost

            scenarios.append({
                "price_change_pct": change_pct,
                "label": f"+{int(change_pct * 100)}%",
                "monthly_cost": round(shocked_monthly, 2),
                "annual_cost": round(shocked_annual, 2),
                "additional_annual_cost": round(additional, 2),
            })

        return {
            "monthly_gallons_gasoline": monthly_gallons_gasoline,
            "monthly_gallons_diesel": monthly_gallons_diesel,
            "current_price_gasoline": round(current_price_gasoline, 3),
            "current_price_diesel": round(current_price_diesel, 3),
            "monthly_fuel_cost": round(monthly_fuel_cost, 2),
            "annual_fuel_cost": round(annual_fuel_cost, 2),
            "fuel_pct_revenue": fuel_pct,
            "scenarios": scenarios,
        }

    def calculate_deal_revenue(self, fee_structure: str, fee_amount: float, aum_value: Optional[float] = None) -> float:
        if fee_structure == "flat":
            return fee_amount
        elif fee_structure == "aum_percentage":
            return (aum_value or 0) * (fee_amount / 100.0)
        elif fee_structure == "subscription":
            return fee_amount * 12
        return 0.0


hedging_engine = HedgingEngine()
