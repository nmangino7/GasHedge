import { getCurrentPrice } from "@/lib/eia-service";
import { calculateHedgePosition } from "@/lib/hedging-engine";
import { getETFPrice } from "@/lib/alpha-vantage";

export async function POST(req: Request) {
  const data = await req.json();

  let fuelPrice = data.current_fuel_price;
  if (fuelPrice == null) {
    fuelPrice =
      (await getCurrentPrice(data.fuel_type, "NUS")) || 3.5;
  }

  let etfPrice = data.current_etf_price;
  if (etfPrice == null) {
    etfPrice = await getETFPrice(data.product_ticker);
  }

  const position = calculateHedgePosition(
    data.monthly_gallons,
    data.fuel_type,
    data.product_ticker,
    data.hedge_ratio,
    fuelPrice,
    etfPrice
  );

  return Response.json(position);
}
