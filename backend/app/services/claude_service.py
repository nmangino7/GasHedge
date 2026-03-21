import os
import json
from typing import Optional

import anthropic

from app.services.compliance import DISCLAIMERS, get_all_disclaimers


class ClaudeService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.model = "claude-sonnet-4-20250514"

    def _get_client(self):
        return anthropic.Anthropic(api_key=self.api_key)

    SYSTEM_PROMPT = """You are a fuel cost management advisor for small businesses.
You provide recommendations using securities-based products (ETFs like UGA, USO, BNO, UNL)
that the advisory firm is licensed to recommend under Series 65/6/63 registrations.

IMPORTANT CONSTRAINTS:
- Only recommend ETF-based hedging strategies (no futures, swaps, or options)
- Include disclaimer that past performance does not guarantee future results
- Explain concepts simply for business owners, not traders
- Focus on business impact: what does this mean for their bottom line
- Always mention the costs: ETF expense ratios, advisory fees, K-1 tax complexity
- Never make specific buy/sell recommendations — frame as analysis and advisory
- You are NOT a broker — you are an investment adviser providing guidance

When discussing hedging:
- UGA tracks gasoline prices (best for gasoline hedging, correlation ~0.88)
- USO tracks crude oil (good for diesel, correlation ~0.80)
- BNO tracks Brent crude (alternative for diesel, correlation ~0.78)
- These ETFs issue K-1 tax forms, not 1099s
- ETF expense ratios range from 0.81% to 0.97% annually
"""

    async def generate_hedge_recommendation(
        self,
        company: dict,
        exposure: dict,
        strategies: list[dict],
        market_context: dict,
    ) -> dict:
        if not self.api_key:
            return {
                "response": "Claude API key not configured. Please add your ANTHROPIC_API_KEY to the .env file.",
                "disclaimers": get_all_disclaimers(),
            }

        user_message = f"""Please provide a hedging recommendation for this company:

COMPANY PROFILE:
- Name: {company.get('name', 'N/A')}
- Type: {company.get('company_type', 'N/A')}
- Fleet Size: {company.get('fleet_size', 'N/A')} vehicles
- Fuel Type: {company.get('fuel_type', 'N/A')}
- Region: {company.get('padd_region', 'N/A')}

FUEL EXPOSURE:
- Monthly Fuel Cost: ${exposure.get('monthly_fuel_cost', 0):,.2f}
- Annual Fuel Cost: ${exposure.get('annual_fuel_cost', 0):,.2f}
- Fuel as % of Revenue: {exposure.get('fuel_pct_revenue', 'N/A')}%

STRATEGY OPTIONS CALCULATED:
{json.dumps(strategies, indent=2, default=str)}

MARKET CONTEXT:
{json.dumps(market_context, indent=2, default=str)}

Please provide:
1. A clear recommendation on which strategy tier is best for this company and why
2. A plain-language explanation of how the hedge works
3. The key risks and costs they should understand
4. Expected outcomes in different price scenarios
"""

        try:
            client = self._get_client()
            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return {
                "response": message.content[0].text,
                "disclaimers": get_all_disclaimers(),
            }
        except Exception as e:
            return {
                "response": f"Unable to generate AI recommendation: {str(e)}",
                "disclaimers": get_all_disclaimers(),
            }

    async def answer_question(
        self, question: str, company_context: Optional[dict] = None
    ) -> dict:
        if not self.api_key:
            return {
                "response": "Claude API key not configured. Please add your ANTHROPIC_API_KEY to the .env file.",
                "disclaimers": get_all_disclaimers(),
            }

        context_str = ""
        if company_context:
            context_str = f"\n\nCOMPANY CONTEXT:\n{json.dumps(company_context, indent=2, default=str)}"

        user_message = f"Question: {question}{context_str}"

        try:
            client = self._get_client()
            message = client.messages.create(
                model=self.model,
                max_tokens=1500,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return {
                "response": message.content[0].text,
                "disclaimers": get_all_disclaimers(),
            }
        except Exception as e:
            return {
                "response": f"Unable to answer: {str(e)}",
                "disclaimers": get_all_disclaimers(),
            }

    async def generate_market_outlook(self, price_data: dict, volatility: dict) -> dict:
        if not self.api_key:
            return {
                "response": "Claude API key not configured.",
                "disclaimers": get_all_disclaimers(),
            }

        user_message = f"""Based on the following fuel price data, provide a brief market outlook:

CURRENT PRICES:
{json.dumps(price_data, indent=2, default=str)}

VOLATILITY METRICS:
{json.dumps(volatility, indent=2, default=str)}

Please provide a 2-3 paragraph market outlook covering:
1. Current price environment
2. Recent trends
3. What this means for small businesses considering fuel hedging
"""

        try:
            client = self._get_client()
            message = client.messages.create(
                model=self.model,
                max_tokens=1000,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return {
                "response": message.content[0].text,
                "disclaimers": get_all_disclaimers(),
            }
        except Exception as e:
            return {
                "response": f"Unable to generate outlook: {str(e)}",
                "disclaimers": get_all_disclaimers(),
            }

    async def generate_report_narrative(
        self,
        company: dict,
        exposure: dict,
        strategy: dict,
        scenarios: list[dict],
    ) -> dict:
        if not self.api_key:
            return {
                "executive_summary": "AI narrative unavailable — Claude API key not configured.",
                "strategy_analysis": "",
                "risk_assessment": "",
            }

        user_message = f"""Generate professional report narratives for a fuel hedging advisory report:

COMPANY: {json.dumps(company, indent=2, default=str)}
EXPOSURE: {json.dumps(exposure, indent=2, default=str)}
STRATEGY: {json.dumps(strategy, indent=2, default=str)}
SCENARIOS: {json.dumps(scenarios, indent=2, default=str)}

Please provide three sections in the following JSON format:
{{
  "executive_summary": "2-3 paragraph executive summary of the fuel exposure and recommendation",
  "strategy_analysis": "1-2 paragraph analysis of the recommended hedging strategy",
  "risk_assessment": "1-2 paragraph risk assessment covering costs, correlation risk, and K-1 tax implications"
}}

Write for a business owner audience, not traders. Be professional but approachable.
"""

        try:
            client = self._get_client()
            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            text = message.content[0].text
            # Try to parse as JSON
            try:
                # Find JSON in the response
                start = text.find("{")
                end = text.rfind("}") + 1
                if start >= 0 and end > start:
                    return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
            return {
                "executive_summary": text,
                "strategy_analysis": "",
                "risk_assessment": "",
            }
        except Exception as e:
            return {
                "executive_summary": f"AI narrative unavailable: {str(e)}",
                "strategy_analysis": "",
                "risk_assessment": "",
            }


claude_service = ClaudeService()
