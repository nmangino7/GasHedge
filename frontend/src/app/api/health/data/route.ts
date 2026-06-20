export const maxDuration = 20;

import { getFuelPrice, getEtfPrice } from "@/services/market-data";
import { rollup } from "@/services/provenance";
import { ok } from "@/api/envelope";

/** Live data-source health: where fuel and ETF prices are coming from right now. */
export async function GET() {
  const [gasoline, diesel, etf] = await Promise.all([
    getFuelPrice("gasoline", "NUS"),
    getFuelPrice("diesel", "NUS"),
    getEtfPrice("UGA"),
  ]);
  return ok({
    overall: rollup(gasoline.provenance, diesel.provenance, etf.provenance),
    sources: {
      fuel: {
        gasoline: { value: gasoline.value, ...gasoline.provenance },
        diesel: { value: diesel.value, ...diesel.provenance },
      },
      etf: { ticker: "UGA", value: etf.value, ...etf.provenance },
    },
  });
}
