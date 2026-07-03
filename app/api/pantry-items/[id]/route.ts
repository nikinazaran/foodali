import { NextResponse } from "next/server";
import { deletePantryItem, updatePantryItem } from "@/lib/db";

export const runtime = "nodejs";

function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const item = updatePantryItem(id, { ingredient, quantity, unit });

  if (!item) {
    return NextResponse.json({ error: "Ingredient not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wasDeleted = deletePantryItem(id);

  if (!wasDeleted) {
    return NextResponse.json({ error: "Ingredient not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
