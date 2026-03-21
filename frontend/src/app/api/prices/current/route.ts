import { getAllCurrentPrices } from "@/lib/eia-service";

export async function GET() {
  const prices = await getAllCurrentPrices();
  return Response.json({
    as_of: new Date().toISOString().slice(0, 10),
    prices,
  });
}
