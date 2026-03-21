import type { StrategyRecommendation } from "@/lib/types";

const tierStyles: Record<string, { badge: string }> = {
  conservative: { badge: "bg-blue-50 text-blue-700" },
  moderate: { badge: "bg-gray-100 text-gray-700" },
  aggressive: { badge: "bg-amber-50 text-amber-700" },
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
  const styles = tierStyles[strategy.tier] || tierStyles.moderate;
  const pos = strategy.position;

  return (
    <div
      className={`rounded-lg border p-5 cursor-pointer transition-all ${
        selected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
          {strategy.tier}
        </span>
        <span className="text-xs font-mono text-gray-500">{pos.product_ticker}</span>
      </div>

      <div className="text-xl font-semibold text-gray-900 mb-3">
        {(strategy.hedge_ratio * 100).toFixed(0)}% Hedge
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Investment</span>
          <span className="text-gray-900 font-medium">${pos.dollar_notional.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Shares</span>
          <span className="text-gray-900 font-medium">{pos.shares_needed.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Annual Expense</span>
          <span className="text-gray-900 font-medium">${pos.annual_expense_cost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Coverage</span>
          <span className="text-gray-900 font-medium">{(pos.effective_hedge_ratio * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Correlation</span>
          <span className="text-gray-900 font-medium">{(pos.correlation_to_retail * 100).toFixed(0)}%</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 leading-relaxed">{strategy.rationale}</p>
    </div>
  );
}
