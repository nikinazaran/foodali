import { NextResponse } from "next/server";
import { createPantryItem, listPantryItems } from "@/lib/db";

export const runtime = "nodejs";

function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

export async function GET() {
  return NextResponse.json({ items: listPantryItems() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    ingredient?: unknown;
    quantity?: unknown;
    unit?: unknown;
  };

  const ingredient = typeof body.ingredient === "string" ? normalizeIngredient(body.ingredient) : "";
  const quantity = body.quantity === null || body.quantity === undefined || body.quantity === "" ? null : Number(body.quantity);
  const unit = typeof body.unit === "string" && body.unit.trim() ? body.unit.trim().toLowerCase() : null;

  if (!ingredient) {
    return NextResponse.json({ error: "Add an ingredient name." }, { status: 400 });
  }

  if (quantity !== null && Number.isNaN(quantity)) {
    return NextResponse.json({ error: "Enter a valid amount or leave it blank." }, { status: 400 });
  }

  const item = createPantryItem({ ingredient, quantity, unit });

  return NextResponse.json({ item }, { status: 201 });
}
