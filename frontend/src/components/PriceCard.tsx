import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CurrentPrice } from "@/lib/types";

export default function PriceCard({ price }: { price: CurrentPrice }) {
  const isUp = price.week_change > 0;
  const isDown = price.week_change < 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-500">
          {price.fuel_type === "gasoline" ? "Gasoline" : "Diesel"}
        </span>
        <span className="text-xs text-gray-400">{price.region_label}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-slate-900">
          ${price.price_per_gallon.toFixed(3)}
        </span>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-400"
        }`}>
          {isUp ? <TrendingUp className="h-4 w-4" /> : isDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          <span>{isUp ? "+" : ""}{price.week_change.toFixed(3)}</span>
          <span className="text-xs">({isUp ? "+" : ""}{price.week_change_pct.toFixed(1)}%)</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">per gallon, weekly avg</p>
    </div>
  );
}
