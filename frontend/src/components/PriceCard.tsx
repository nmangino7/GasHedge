import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CurrentPrice } from "@/lib/types";

export default function PriceCard({ price }: { price: CurrentPrice }) {
  const isUp = price.week_change > 0;
  const isDown = price.week_change < 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider capitalize">
          {price.fuel_type}
        </span>
        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          isUp ? "bg-rose-50 text-rose-600" : isDown ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
        }`}>
          <Icon className="h-3 w-3" />
          {isUp ? "+" : ""}{price.week_change_pct.toFixed(1)}%
        </span>
      </div>
      <p className="text-xl font-bold text-slate-900">${price.price_per_gallon.toFixed(3)}</p>
      <p className="text-[11px] text-slate-400 mt-1">{price.region_label}</p>
    </div>
  );
}
