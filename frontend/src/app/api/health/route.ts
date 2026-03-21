export async function GET() {
  return Response.json({ status: "healthy", service: "GasHedge API" });
}
