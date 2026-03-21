DISCLAIMERS = {
    "general": (
        "This analysis is provided for informational purposes and constitutes investment advice "
        "under an advisory relationship. Securities recommended are limited to registered investment "
        "products (ETFs, mutual funds) for which the adviser is properly licensed under Series 65/6/63 "
        "registrations. This is not an offer to buy or sell commodity futures, swaps, or options."
    ),
    "performance": (
        "Past performance does not guarantee future results. Commodity ETFs involve significant risks "
        "including contango losses, tracking error, and may not perfectly correlate with retail fuel "
        "prices. The value of investments can go down as well as up."
    ),
    "tax": (
        "Commodity ETFs structured as limited partnerships (UGA, USO, BNO, UNL) issue Schedule K-1 "
        "tax forms rather than Form 1099. Gains are typically taxed at a blended rate of 60% long-term "
        "and 40% short-term capital gains, regardless of holding period. Consult a qualified tax "
        "professional for advice specific to your situation."
    ),
    "suitability": (
        "Hedging strategies should be evaluated based on each company's specific financial situation, "
        "risk tolerance, and fuel cost exposure. Not all strategies are suitable for all businesses. "
        "The adviser's fee schedule is disclosed in Form ADV Part 2A."
    ),
    "backtest": (
        "HYPOTHETICAL PERFORMANCE RESULTS have many inherent limitations. No representation is made "
        "that any account will or is likely to achieve profits or losses similar to those shown. "
        "Hypothetical results do not represent actual trading and may not reflect the impact of "
        "material economic and market factors."
    ),
}


def get_all_disclaimers() -> list[str]:
    return list(DISCLAIMERS.values())


def get_disclaimer(key: str) -> str:
    return DISCLAIMERS.get(key, "")


def get_report_disclaimers() -> str:
    return "\n\n".join([
        DISCLAIMERS["general"],
        DISCLAIMERS["performance"],
        DISCLAIMERS["tax"],
        DISCLAIMERS["suitability"],
        DISCLAIMERS["backtest"],
    ])
