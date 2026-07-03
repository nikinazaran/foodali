import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import { createRecipe, listRecipes } from "@/lib/db";

export const runtime = "nodejs";

type RecipeIngredientInput = {
  ingredient?: unknown;
  quantity?: unknown;
  unit?: unknown;
};

const imageUploadDir = join(process.cwd(), "public", "uploads", "recipes");

function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

function normalizeNullableText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getSourceType(sourceUrl: string | null) {
  if (!sourceUrl) {
    return null;
  }

  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();

    if (hostname.includes("tiktok")) {
      return "TikTok";
    }

    if (hostname.includes("instagram")) {
      return "Instagram";
    }
  } catch {
    return null;
  }

  return "Link";
}

function getImageExtension(file: File) {
  const extension = extname(file.name).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) {
    return extension;
  }

  if (file.type === "image/png") {
    return ".png";
  }

  if (file.type === "image/webp") {
    return ".webp";
  }

  if (file.type === "image/gif") {
    return ".gif";
  }

  return ".jpg";
}

async function saveRecipeImage(file: File) {
  if (file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Recipe photo must be an image.");
  }

  await mkdir(imageUploadDir, { recursive: true });

  const filename = `${crypto.randomUUID()}${getImageExtension(file)}`;
  const filepath = join(imageUploadDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, bytes);

  return `/uploads/recipes/${filename}`;
}

function parseIngredients(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  let parsed: RecipeIngredientInput[];

  try {
    parsed = JSON.parse(value) as RecipeIngredientInput[];
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => {
      const ingredient = typeof item.ingredient === "string" ? normalizeIngredient(item.ingredient) : "";
      const quantity = item.quantity === null || item.quantity === undefined || item.quantity === "" ? null : Number(item.quantity);
      const unit = typeof item.unit === "string" && item.unit.trim() ? item.unit.trim().toLowerCase() : null;

      return { ingredient, quantity, unit };
    })
    .filter((item) => item.ingredient);
}

export async function GET() {
  return NextResponse.json({ recipes: listRecipes() });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const title = normalizeNullableText(formData.get("title"));
  const description = normalizeNullableText(formData.get("description"));
  const sourceUrl = normalizeNullableText(formData.get("sourceUrl"));
  const ingredients = parseIngredients(formData.get("ingredients"));
  const photo = formData.get("photo");

  if (!title) {
    return NextResponse.json({ error: "Add a recipe title." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json({ error: "Add a recipe description." }, { status: 400 });
  }

  if (sourceUrl) {
    try {
      new URL(sourceUrl);
    } catch {
      return NextResponse.json({ error: "Enter a valid recipe URL or leave it blank." }, { status: 400 });
    }
  }

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "Add at least one recipe ingredient." }, { status: 400 });
  }

  if (ingredients.some((ingredient) => ingredient.quantity !== null && Number.isNaN(ingredient.quantity))) {
    return NextResponse.json({ error: "Enter valid ingredient amounts or leave them blank." }, { status: 400 });
  }

  let imagePath: string | null = null;

  try {
    imagePath = photo instanceof File ? await saveRecipeImage(photo) : null;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save that recipe photo." },
      { status: 400 }
    );
  }

  const recipe = createRecipe({
    title,
    description,
    sourceUrl,
    sourceType: getSourceType(sourceUrl),
    imagePath,
    ingredients
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
