import { ShieldCheck } from "lucide-react";

export default function ComplianceDisclaimer({ disclaimers }: { disclaimers?: string[] }) {
  const defaultDisclaimers = [
    "This analysis is provided for informational purposes under a Series 65/66 investment-adviser registration. Securities recommended are limited to registered investment products (ETFs, mutual funds) and listed options on those products. This is not an offer to buy or sell commodity futures, swaps, or futures options.",
    "ETF options: Strategies are presented as advisory recommendations. Execution is performed by the client through their own brokerage account or via a managed account where the adviser holds appropriate authorization. The adviser does not collect commissions on options trades — only the disclosed advisory fee applies.",
    "Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses, tracking error, and may not perfectly correlate with retail fuel prices. Options carry the risk of total premium loss for buyers and the risk of assignment for sellers.",
    "Commodity ETFs structured as limited partnerships (UGA, USO, BNO, UNL) issue Schedule K-1 tax forms. Gains are taxed at a blended 60% long-term / 40% short-term rate regardless of holding period. Options on these ETFs may have different tax treatment. Consult a qualified tax professional.",
    "Hedging strategies must be evaluated based on each business's financial situation, risk tolerance, and fuel cost exposure. Not all strategies are suitable for all businesses. The adviser's fee schedule and conflicts of interest are disclosed in Form ADV Part 2A.",
    "Modeled option values are estimated using Black-Scholes with assumed implied volatility per ticker. Actual market bid/ask spreads may differ materially. Live underlying prices delayed up to 15 minutes via Yahoo Finance.",
  ];

  const items = disclaimers && disclaimers.length > 0 ? disclaimers : defaultDisclaimers;

  return (
    <div className="surface mt-6 p-5" style={{ background: "var(--bg)" }}>
      <p className="h-section mb-3 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Important Disclosures
      </p>
      <ul className="space-y-1.5">
        {items.map((d, i) => (
          <li key={i} className="text-[11.5px] text-[color:var(--muted)] leading-relaxed">
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}
