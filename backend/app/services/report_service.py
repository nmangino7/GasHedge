import os
import io
import json
from datetime import datetime
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

from app.services.compliance import get_report_disclaimers


# Brand colors
PRIMARY = HexColor("#1a365d")
SECONDARY = HexColor("#2b6cb0")
ACCENT = HexColor("#48bb78")
DANGER = HexColor("#e53e3e")
LIGHT_BG = HexColor("#f7fafc")
BORDER = HexColor("#e2e8f0")


class ReportService:
    def __init__(self):
        self.reports_dir = os.path.join(os.path.dirname(__file__), "..", "..", "reports")
        os.makedirs(self.reports_dir, exist_ok=True)

    def generate_report(
        self,
        company: dict,
        exposure: dict,
        strategy: dict,
        scenarios: list[dict],
        backtest: Optional[dict] = None,
        ai_narrative: Optional[dict] = None,
        fee_info: Optional[dict] = None,
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        company_slug = company["name"].replace(" ", "_").lower()[:30]
        filename = f"hedge_report_{company_slug}_{timestamp}.pdf"
        filepath = os.path.join(self.reports_dir, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            "CoverTitle", parent=styles["Title"],
            fontSize=28, textColor=PRIMARY, spaceAfter=6, alignment=TA_CENTER,
        ))
        styles.add(ParagraphStyle(
            "CoverSubtitle", parent=styles["Normal"],
            fontSize=14, textColor=SECONDARY, spaceAfter=30, alignment=TA_CENTER,
        ))
        styles.add(ParagraphStyle(
            "SectionHeader", parent=styles["Heading1"],
            fontSize=16, textColor=PRIMARY, spaceBefore=20, spaceAfter=10,
        ))
        styles.add(ParagraphStyle(
            "SubHeader", parent=styles["Heading2"],
            fontSize=12, textColor=SECONDARY, spaceBefore=12, spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            "BodyText", parent=styles["Normal"],
            fontSize=10, leading=14, alignment=TA_JUSTIFY, spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            "Disclaimer", parent=styles["Normal"],
            fontSize=7, leading=9, textColor=HexColor("#718096"), spaceAfter=4,
        ))

        story = []

        # --- Cover Page ---
        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph("GasHedge", styles["CoverTitle"]))
        story.append(Paragraph("Fuel Cost Management Strategy", styles["CoverSubtitle"]))
        story.append(Spacer(1, 0.5 * inch))
        story.append(HRFlowable(width="60%", thickness=2, color=PRIMARY))
        story.append(Spacer(1, 0.5 * inch))
        story.append(Paragraph(f"Prepared for: <b>{company['name']}</b>", styles["BodyText"]))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", styles["BodyText"]))
        story.append(Paragraph(f"Contact: {company.get('contact_name', 'N/A')}", styles["BodyText"]))
        story.append(Spacer(1, 1 * inch))
        story.append(Paragraph(
            "<i>CONFIDENTIAL — Prepared for the exclusive use of the named recipient</i>",
            styles["Disclaimer"]
        ))
        story.append(PageBreak())

        # --- Executive Summary ---
        story.append(Paragraph("1. Executive Summary", styles["SectionHeader"]))
        if ai_narrative and ai_narrative.get("executive_summary"):
            for para in ai_narrative["executive_summary"].split("\n\n"):
                if para.strip():
                    story.append(Paragraph(para.strip(), styles["BodyText"]))
        else:
            story.append(Paragraph(
                f"{company['name']} operates a {company.get('company_type', '')} business with a fleet of "
                f"{company.get('fleet_size', 'N/A')} vehicles. Based on current fuel prices, the company's "
                f"estimated annual fuel expenditure is ${exposure.get('annual_fuel_cost', 0):,.2f}. "
                f"This report outlines a hedging strategy using ETF-based instruments to help manage "
                f"fuel price volatility and protect operating margins.",
                styles["BodyText"]
            ))
        story.append(Spacer(1, 0.2 * inch))

        # --- Current Fuel Exposure ---
        story.append(Paragraph("2. Current Fuel Exposure", styles["SectionHeader"]))

        exposure_data = [
            ["Metric", "Value"],
            ["Monthly Gasoline (gal)", f"{exposure.get('monthly_gallons_gasoline', 0):,.0f}"],
            ["Monthly Diesel (gal)", f"{exposure.get('monthly_gallons_diesel', 0):,.0f}"],
            ["Current Gas Price", f"${exposure.get('current_price_gasoline', 0):.3f}/gal"],
            ["Current Diesel Price", f"${exposure.get('current_price_diesel', 0):.3f}/gal"],
            ["Monthly Fuel Cost", f"${exposure.get('monthly_fuel_cost', 0):,.2f}"],
            ["Annual Fuel Cost", f"${exposure.get('annual_fuel_cost', 0):,.2f}"],
        ]
        if exposure.get("fuel_pct_revenue"):
            exposure_data.append(["Fuel as % of Revenue", f"{exposure['fuel_pct_revenue']:.1f}%"])

        t = Table(exposure_data, colWidths=[3 * inch, 3 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), LIGHT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.2 * inch))

        # --- Price Shock Scenarios ---
        if exposure.get("scenarios"):
            story.append(Paragraph("2.1 Price Shock Impact (Without Hedging)", styles["SubHeader"]))
            shock_data = [["Price Change", "Annual Cost", "Additional Cost"]]
            for s in exposure["scenarios"]:
                shock_data.append([
                    s["label"],
                    f"${s['annual_cost']:,.2f}",
                    f"+${s['additional_annual_cost']:,.2f}",
                ])
            t2 = Table(shock_data, colWidths=[2 * inch, 2 * inch, 2 * inch])
            t2.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), SECONDARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(t2)

        story.append(PageBreak())

        # --- Recommended Strategy ---
        story.append(Paragraph("3. Recommended Hedging Strategy", styles["SectionHeader"]))

        pos = strategy.get("position", strategy)
        strategy_data = [
            ["Parameter", "Value"],
            ["ETF Instrument", f"{pos.get('product_ticker', 'N/A')} — {pos.get('product_name', 'N/A')}"],
            ["Hedge Ratio", f"{pos.get('hedge_ratio', 0) * 100:.0f}% of consumption"],
            ["Gallons Hedged (annual)", f"{pos.get('gallons_hedged', 0):,.0f}"],
            ["Investment Required", f"${pos.get('dollar_notional', 0):,.2f}"],
            ["Shares to Purchase", f"{pos.get('shares_needed', 0):,}"],
            ["ETF Share Price", f"${pos.get('etf_price', 0):.2f}"],
            ["Correlation to Retail", f"{pos.get('correlation_to_retail', 0):.0%}"],
            ["Effective Hedge Coverage", f"{pos.get('effective_hedge_ratio', 0):.1%}"],
            ["Annual ETF Expense", f"${pos.get('annual_expense_cost', 0):,.2f}"],
        ]

        t3 = Table(strategy_data, colWidths=[3 * inch, 3 * inch])
        t3.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), LIGHT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t3)
        story.append(Spacer(1, 0.2 * inch))

        if ai_narrative and ai_narrative.get("strategy_analysis"):
            story.append(Paragraph(ai_narrative["strategy_analysis"], styles["BodyText"]))

        # --- Scenario Analysis ---
        story.append(Paragraph("4. Scenario Analysis — Hedged vs. Unhedged", styles["SectionHeader"]))

        if scenarios:
            # Create chart
            chart_path = self._create_scenario_chart(scenarios)
            if chart_path:
                story.append(Image(chart_path, width=6 * inch, height=3.5 * inch))
                story.append(Spacer(1, 0.1 * inch))

            scenario_table = [["Price Change", "Unhedged Cost", "Hedged Cost", "Savings"]]
            for s in scenarios:
                savings_str = f"${s['savings']:,.2f}" if s['savings'] >= 0 else f"-${abs(s['savings']):,.2f}"
                scenario_table.append([
                    f"{s['price_change_pct']:+.0%}",
                    f"${s['unhedged_annual_cost']:,.2f}",
                    f"${s['hedged_annual_cost']:,.2f}",
                    savings_str,
                ])

            t4 = Table(scenario_table, colWidths=[1.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch])
            t4.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), SECONDARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(t4)

        story.append(PageBreak())

        # --- Historical Backtest ---
        if backtest and backtest.get("periods"):
            story.append(Paragraph("5. Historical Backtest Results", styles["SectionHeader"]))
            story.append(Paragraph(
                f"Period: {backtest.get('start_date', 'N/A')} to {backtest.get('end_date', 'N/A')} "
                f"({backtest.get('period_count', 0)} weeks)",
                styles["BodyText"]
            ))

            bt_data = [
                ["Metric", "Value"],
                ["Total Unhedged Cost", f"${backtest['total_unhedged_cost']:,.2f}"],
                ["Total Hedged Cost", f"${backtest['total_hedged_cost']:,.2f}"],
                ["Total Savings", f"${backtest['total_savings']:,.2f}"],
                ["Savings %", f"{backtest['savings_pct']:.1f}%"],
            ]
            t5 = Table(bt_data, colWidths=[3 * inch, 3 * inch])
            t5.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(t5)
            story.append(Spacer(1, 0.1 * inch))
            story.append(Paragraph(
                f"<i>{DISCLAIMERS['backtest']}</i>",
                styles["Disclaimer"]
            ))
            story.append(Spacer(1, 0.2 * inch))

        # --- Cost-Benefit Summary ---
        story.append(Paragraph("6. Cost-Benefit Summary", styles["SectionHeader"]))

        annual_expense = pos.get("annual_expense_cost", 0)
        advisory_fee = 0
        fee_desc = "N/A"
        if fee_info:
            advisory_fee = fee_info.get("annual_fee_revenue", 0)
            fee_desc = f"{fee_info.get('fee_structure', 'N/A')} — ${advisory_fee:,.2f}/year"

        total_cost = annual_expense + advisory_fee
        annual_fuel = exposure.get("annual_fuel_cost", 0)
        breakeven_pct = (total_cost / annual_fuel * 100) if annual_fuel > 0 else 0

        cb_data = [
            ["Cost Component", "Annual Amount"],
            ["ETF Expense Ratio", f"${annual_expense:,.2f}"],
            ["Advisory Fee", fee_desc],
            ["Total Hedging Cost", f"${total_cost:,.2f}"],
            ["Break-even Price Increase", f"{breakeven_pct:.1f}%"],
        ]
        t6 = Table(cb_data, colWidths=[3 * inch, 3 * inch])
        t6.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), LIGHT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t6)
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph(
            f"The hedge becomes profitable if fuel prices increase by more than {breakeven_pct:.1f}% "
            f"from current levels, which would cost the company an additional "
            f"${(annual_fuel * breakeven_pct / 100):,.2f} without hedging.",
            styles["BodyText"]
        ))

        if ai_narrative and ai_narrative.get("risk_assessment"):
            story.append(Spacer(1, 0.1 * inch))
            story.append(Paragraph(ai_narrative["risk_assessment"], styles["BodyText"]))

        story.append(PageBreak())

        # --- Disclaimers ---
        story.append(Paragraph("Important Disclosures", styles["SectionHeader"]))
        story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
        story.append(Spacer(1, 0.1 * inch))

        for disclaimer in get_report_disclaimers().split("\n\n"):
            story.append(Paragraph(disclaimer, styles["Disclaimer"]))
            story.append(Spacer(1, 0.05 * inch))

        # Build PDF
        doc.build(story)

        # Cleanup temp chart files
        for f in os.listdir(self.reports_dir):
            if f.startswith("temp_chart_") and f.endswith(".png"):
                try:
                    os.remove(os.path.join(self.reports_dir, f))
                except Exception:
                    pass

        return filename

    def _create_scenario_chart(self, scenarios: list[dict]) -> Optional[str]:
        try:
            fig, ax = plt.subplots(figsize=(8, 4.5))

            changes = [s["price_change_pct"] * 100 for s in scenarios]
            unhedged = [s["unhedged_annual_cost"] for s in scenarios]
            hedged = [s["hedged_annual_cost"] for s in scenarios]

            ax.plot(changes, unhedged, "o-", color="#e53e3e", linewidth=2, label="Unhedged", markersize=6)
            ax.plot(changes, hedged, "o-", color="#48bb78", linewidth=2, label="Hedged", markersize=6)

            ax.fill_between(changes, unhedged, hedged,
                          where=[u > h for u, h in zip(unhedged, hedged)],
                          alpha=0.15, color="#48bb78", label="Savings")
            ax.fill_between(changes, unhedged, hedged,
                          where=[u <= h for u, h in zip(unhedged, hedged)],
                          alpha=0.15, color="#e53e3e", label="Hedge Cost")

            ax.set_xlabel("Fuel Price Change (%)", fontsize=10)
            ax.set_ylabel("Annual Fuel Cost ($)", fontsize=10)
            ax.set_title("Hedged vs. Unhedged Annual Fuel Cost", fontsize=13, fontweight="bold", color="#1a365d")
            ax.legend(fontsize=9)
            ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f"${x:,.0f}"))
            ax.grid(True, alpha=0.3)
            ax.set_facecolor("#f7fafc")
            fig.tight_layout()

            chart_path = os.path.join(self.reports_dir, f"temp_chart_{datetime.now().strftime('%H%M%S')}.png")
            fig.savefig(chart_path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            return chart_path
        except Exception:
            return None


report_service = ReportService()
