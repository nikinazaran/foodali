import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type PantryItem = {
  id: string;
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  created_at: string;
};

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_type: string | null;
  image_path: string | null;
  created_at: string;
  ingredients: RecipeIngredient[];
};

const dataDir = join(process.cwd(), "data");
const databasePath = join(dataDir, "foodali.sqlite");

let database: DatabaseSync | null = null;

function getDatabase() {
  if (!database) {
    mkdirSync(dataDir, { recursive: true });
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(`
      create table if not exists pantry_items (
        id text primary key,
        ingredient text not null,
        quantity real,
        unit text,
        notes text,
        created_at text not null default (datetime('now'))
      );

      create table if not exists recipes (
        id text primary key,
        title text not null,
        description text,
        source_url text,
        source_type text,
        notes text,
        image_path text,
        created_at text not null default (datetime('now'))
      );

      create table if not exists recipe_ingredients (
        id text primary key,
        recipe_id text not null references recipes(id) on delete cascade,
        ingredient text not null,
        quantity real,
        unit text,
        created_at text not null default (datetime('now'))
      );
    `);
    ensureColumn("recipes", "description", "text");
  }

  return database;
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = database?.prepare(`pragma table_info(${table})`).all() ?? [];
  const hasColumn = columns.some((row) => (row as { name?: string }).name === column);

  if (!hasColumn) {
    database?.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

function toPantryItem(row: unknown): PantryItem {
  const item = row as PantryItem;

  return {
    id: String(item.id),
    ingredient: String(item.ingredient),
    quantity: item.quantity === null ? null : Number(item.quantity),
    unit: item.unit,
    notes: item.notes,
    created_at: String(item.created_at)
  };
}

function toRecipeIngredient(row: unknown): RecipeIngredient {
  const ingredient = row as RecipeIngredient;

  return {
    id: String(ingredient.id),
    recipe_id: String(ingredient.recipe_id),
    ingredient: String(ingredient.ingredient),
    quantity: ingredient.quantity === null ? null : Number(ingredient.quantity),
    unit: ingredient.unit,
    created_at: String(ingredient.created_at)
  };
}

function toRecipe(row: unknown): Omit<Recipe, "ingredients"> {
  const recipe = row as Omit<Recipe, "ingredients">;

  return {
    id: String(recipe.id),
    title: String(recipe.title),
    description: recipe.description,
    source_url: recipe.source_url,
    source_type: recipe.source_type,
    image_path: recipe.image_path,
    created_at: String(recipe.created_at)
  };
}

export function listPantryItems() {
  const rows = getDatabase()
    .prepare("select id, ingredient, quantity, unit, notes, created_at from pantry_items order by created_at desc")
    .all();

  return rows.map(toPantryItem);
}

export function createPantryItem(input: {
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  notes?: string | null;
}) {
  const id = crypto.randomUUID();

  getDatabase()
    .prepare(
      "insert into pantry_items (id, ingredient, quantity, unit, notes) values (?, ?, ?, ?, ?)"
    )
    .run(id, input.ingredient, input.quantity, input.unit, input.notes ?? null);

  const row = getDatabase()
    .prepare("select id, ingredient, quantity, unit, notes, created_at from pantry_items where id = ?")
    .get(id);

  return toPantryItem(row);
}

export function updatePantryItem(
  id: string,
  input: {
    ingredient: string;
    quantity: number | null;
    unit: string | null;
    notes?: string | null;
  }
) {
  const result = getDatabase()
    .prepare(
      "update pantry_items set ingredient = ?, quantity = ?, unit = ?, notes = ? where id = ?"
    )
    .run(input.ingredient, input.quantity, input.unit, input.notes ?? null, id);

  if (result.changes === 0) {
    return null;
  }

  const row = getDatabase()
    .prepare("select id, ingredient, quantity, unit, notes, created_at from pantry_items where id = ?")
    .get(id);

  return toPantryItem(row);
}

export function deletePantryItem(id: string) {
  const result = getDatabase().prepare("delete from pantry_items where id = ?").run(id);

  return result.changes > 0;
}

export function listRecipes() {
  const db = getDatabase();
  const recipes = db
    .prepare("select id, title, description, source_url, source_type, image_path, created_at from recipes order by created_at desc")
    .all()
    .map(toRecipe);

  const ingredientStatement = db.prepare(
    "select id, recipe_id, ingredient, quantity, unit, created_at from recipe_ingredients where recipe_id = ? order by created_at asc"
  );

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: ingredientStatement.all(recipe.id).map(toRecipeIngredient)
  }));
}

export function createRecipe(input: {
  title: string;
  description: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  imagePath: string | null;
  ingredients: Array<{
    ingredient: string;
    quantity: number | null;
    unit: string | null;
  }>;
}) {
  const db = getDatabase();
  const id = crypto.randomUUID();

  db.exec("begin");

  try {
    db.prepare(
      "insert into recipes (id, title, description, source_url, source_type, image_path) values (?, ?, ?, ?, ?, ?)"
    ).run(id, input.title, input.description, input.sourceUrl, input.sourceType, input.imagePath);

    const ingredientStatement = db.prepare(
      "insert into recipe_ingredients (id, recipe_id, ingredient, quantity, unit) values (?, ?, ?, ?, ?)"
    );

    for (const ingredient of input.ingredients) {
      ingredientStatement.run(
        crypto.randomUUID(),
        id,
        ingredient.ingredient,
        ingredient.quantity,
        ingredient.unit
      );
    }

    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }

  return listRecipes().find((recipe) => recipe.id === id) ?? null;
}

export function updateRecipe(
  id: string,
  input: {
    title: string;
    description: string | null;
    sourceUrl: string | null;
    sourceType: string | null;
    imagePath?: string | null;
    ingredients: Array<{
      ingredient: string;
      quantity: number | null;
      unit: string | null;
    }>;
  }
) {
  const db = getDatabase();
  const existingRecipe = db.prepare("select id, image_path from recipes where id = ?").get(id) as
    | { id: string; image_path: string | null }
    | undefined;

  if (!existingRecipe) {
    return null;
  }

  const imagePath = input.imagePath === undefined ? existingRecipe.image_path : input.imagePath;

  db.exec("begin");

  try {
    db.prepare(
      "update recipes set title = ?, description = ?, source_url = ?, source_type = ?, image_path = ? where id = ?"
    ).run(input.title, input.description, input.sourceUrl, input.sourceType, imagePath, id);

    db.prepare("delete from recipe_ingredients where recipe_id = ?").run(id);

    const ingredientStatement = db.prepare(
      "insert into recipe_ingredients (id, recipe_id, ingredient, quantity, unit) values (?, ?, ?, ?, ?)"
    );

    for (const ingredient of input.ingredients) {
      ingredientStatement.run(
        crypto.randomUUID(),
        id,
        ingredient.ingredient,
        ingredient.quantity,
        ingredient.unit
      );
    }

    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }

  return listRecipes().find((recipe) => recipe.id === id) ?? null;
}

export function deleteRecipe(id: string) {
  const result = getDatabase().prepare("delete from recipes where id = ?").run(id);

  return result.changes > 0;
}
