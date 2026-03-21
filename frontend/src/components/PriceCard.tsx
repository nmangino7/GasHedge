import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CurrentPrice } from "@/lib/types";

export default function PriceCard({ price }: { price: CurrentPrice }) {
  const isUp = price.week_change > 0;
  const isDown = price.week_change < 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {price.fuel_type === "gasoline" ? "Gasoline" : "Diesel"}
        </span>
        <span className="text-xs text-gray-400">{price.region_label}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-2xl font-semibold text-gray-900">
          ${price.price_per_gallon.toFixed(3)}
        </span>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isUp ? "text-red-600" : isDown ? "text-green-600" : "text-gray-400"
        }`}>
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          <span>{isUp ? "+" : ""}{price.week_change.toFixed(3)}</span>
          <span className="text-xs">({isUp ? "+" : ""}{price.week_change_pct.toFixed(1)}%)</span>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">per gallon, weekly avg</p>
    </div>
  );
}
