import { NextRequest } from "next/server";
import { optionPositionStore } from "@/lib/store";
import type { OptionPositionUpdateInput } from "@/lib/store-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const position = await optionPositionStore.get(Number(id));
  if (!position) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ position });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: OptionPositionUpdateInput;
  try {
    body = (await request.json()) as OptionPositionUpdateInput;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.status === "closed" && !body.closed_at) {
    body.closed_at = new Date().toISOString();
  }
  const position = await optionPositionStore.update(Number(id), body);
  if (!position) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ position });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await optionPositionStore.delete(Number(id));
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
