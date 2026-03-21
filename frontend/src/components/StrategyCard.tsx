import type { StrategyRecommendation } from "@/lib/types";

const tierColors: Record<string, { bg: string; border: string; badge: string }> = {
  conservative: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  moderate: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  aggressive: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
};

export default function StrategyCard({
  strategy,
  onSelect,
  selected,
}: {
  strategy: StrategyRecommendation;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const colors = tierColors[strategy.tier] || tierColors.moderate;
  const pos = strategy.position;

  return (
    <div
      className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${colors.bg} ${
        selected ? "border-emerald-500 ring-2 ring-emerald-200" : colors.border
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${colors.badge}`}>
          {strategy.tier}
        </span>
        <span className="text-sm font-medium text-gray-500">{pos.product_ticker}</span>
      </div>

      <div className="text-2xl font-bold text-slate-900 mb-1">
        {(strategy.hedge_ratio * 100).toFixed(0)}% Hedge
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Investment Required</span>
          <span className="font-semibold">${pos.dollar_notional.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Shares to Buy</span>
          <span className="font-semibold">{pos.shares_needed.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Annual ETF Expense</span>
          <span className="font-semibold">${pos.annual_expense_cost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Effective Coverage</span>
          <span className="font-semibold">{(pos.effective_hedge_ratio * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Correlation</span>
          <span className="font-semibold">{(pos.correlation_to_retail * 100).toFixed(0)}%</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 leading-relaxed">{strategy.rationale}</p>
    </div>
  );
}
