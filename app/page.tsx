"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Database, ExternalLink, Link, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import Image from "next/image";

type PantryItem = {
  id: string;
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
};

type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  created_at: string;
};

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_type: string | null;
  image_path: string | null;
  created_at: string;
  ingredients: RecipeIngredient[];
};

type RecipeIngredientDraft = {
  id: string;
  ingredient: string;
  quantity: string;
  unit: string;
};

function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity === null) {
    return unit ? unit : "";
  }

  return unit ? `${quantity} ${unit}` : `${quantity}`;
}

function formatIngredientAmount(ingredient: Pick<RecipeIngredient, "quantity" | "unit">) {
  return formatQuantity(ingredient.quantity, ingredient.unit);
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export default function Home() {
  const isSavingRecipeRef = useRef(false);
  const recipeFormRef = useRef<HTMLFormElement | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [quantityDraft, setQuantityDraft] = useState("");
  const [unitDraft, setUnitDraft] = useState("");
  const [pantryMessage, setPantryMessage] = useState("");
  const [pantryError, setPantryError] = useState("");
  const [recipeMessage, setRecipeMessage] = useState("");
  const [recipeError, setRecipeError] = useState("");
  const [isLoadingPantry, setIsLoadingPantry] = useState(true);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isSavingPantryItem, setIsSavingPantryItem] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editIngredientDraft, setEditIngredientDraft] = useState("");
  const [editQuantityDraft, setEditQuantityDraft] = useState("");
  const [editUnitDraft, setEditUnitDraft] = useState("");
  const [isUpdatingPantryItem, setIsUpdatingPantryItem] = useState(false);
  const [recipeTitleDraft, setRecipeTitleDraft] = useState("");
  const [recipeDescriptionDraft, setRecipeDescriptionDraft] = useState("");
  const [recipeUrlDraft, setRecipeUrlDraft] = useState("");
  const [recipePhotoDraft, setRecipePhotoDraft] = useState<File | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingRecipeImagePath, setEditingRecipeImagePath] = useState<string | null>(null);
  const [recipeIngredientDrafts, setRecipeIngredientDrafts] = useState<RecipeIngredientDraft[]>([
    { id: crypto.randomUUID(), ingredient: "", quantity: "", unit: "" }
  ]);

  useEffect(() => {
    void loadPantryItems();
    void loadRecipes();
  }, []);

  const pantryIngredientSet = useMemo(
    () => new Set(pantryItems.map((item) => normalizeIngredient(item.ingredient))),
    [pantryItems]
  );

  const makeableRecipes = useMemo(
    () =>
      recipes.filter((recipe) =>
        recipe.ingredients.every((ingredient) => pantryIngredientSet.has(normalizeIngredient(ingredient.ingredient)))
      ),
    [pantryIngredientSet, recipes]
  );

  async function loadPantryItems() {
    setIsLoadingPantry(true);
    setPantryError("");

    try {
      const response = await fetch("/api/pantry-items", { cache: "no-store" });

      if (!response.ok) {
        setPantryError(await readApiError(response));
        setPantryItems([]);
        return;
      }

      const body = (await response.json()) as { items: PantryItem[] };
      setPantryItems(body.items);
    } catch {
      setPantryError("Could not load the local pantry database.");
      setPantryItems([]);
    } finally {
      setIsLoadingPantry(false);
    }
  }

  async function loadRecipes() {
    setIsLoadingRecipes(true);
    setRecipeError("");

    try {
      const response = await fetch("/api/recipes", { cache: "no-store" });

      if (!response.ok) {
        setRecipeError(await readApiError(response));
        setRecipes([]);
        return;
      }

      const body = (await response.json()) as { recipes: Recipe[] };
      setRecipes(body.recipes);
    } catch {
      setRecipeError("Could not load recipes from the local database.");
      setRecipes([]);
    } finally {
      setIsLoadingRecipes(false);
    }
  }

  async function handleAddIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ingredient = normalizeIngredient(ingredientDraft);
    const quantityValue = quantityDraft.trim() === "" ? null : Number(quantityDraft);

    if (!ingredient) {
      setPantryError("Add an ingredient name.");
      return;
    }

    if (quantityValue !== null && Number.isNaN(quantityValue)) {
      setPantryError("Enter a valid amount or leave it blank.");
      return;
    }

    setIsSavingPantryItem(true);
    setPantryError("");
    setPantryMessage("");

    try {
      const response = await fetch("/api/pantry-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient,
          quantity: quantityValue,
          unit: unitDraft.trim() === "" ? null : unitDraft.trim().toLowerCase()
        })
      });

      if (!response.ok) {
        setPantryError(await readApiError(response));
        return;
      }

      setIngredientDraft("");
      setQuantityDraft("");
      setUnitDraft("");
      setPantryMessage("Saved to the local database.");
      await loadPantryItems();
    } catch {
      setPantryError("Could not save to the local pantry database.");
    } finally {
      setIsSavingPantryItem(false);
    }
  }

  async function handleRemoveIngredient(itemId: string) {
    setPantryError("");
    setPantryMessage("");

    try {
      const response = await fetch(`/api/pantry-items/${itemId}`, { method: "DELETE" });

      if (!response.ok) {
        setPantryError(await readApiError(response));
        return;
      }

      setPantryMessage("Removed from the local database.");
      await loadPantryItems();
    } catch {
      setPantryError("Could not remove that ingredient.");
    }
  }

  function handleStartEditing(item: PantryItem) {
    setEditingItemId(item.id);
    setEditIngredientDraft(item.ingredient);
    setEditQuantityDraft(item.quantity === null ? "" : String(item.quantity));
    setEditUnitDraft(item.unit ?? "");
    setPantryError("");
    setPantryMessage("");
  }

  function handleCancelEditing() {
    setEditingItemId(null);
    setEditIngredientDraft("");
    setEditQuantityDraft("");
    setEditUnitDraft("");
  }

  async function handleUpdateIngredient(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();

    const ingredient = normalizeIngredient(editIngredientDraft);
    const quantityValue = editQuantityDraft.trim() === "" ? null : Number(editQuantityDraft);

    if (!ingredient) {
      setPantryError("Add an ingredient name.");
      return;
    }

    if (quantityValue !== null && Number.isNaN(quantityValue)) {
      setPantryError("Enter a valid amount or leave it blank.");
      return;
    }

    setIsUpdatingPantryItem(true);
    setPantryError("");
    setPantryMessage("");

    try {
      const response = await fetch(`/api/pantry-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient,
          quantity: quantityValue,
          unit: editUnitDraft.trim() === "" ? null : editUnitDraft.trim().toLowerCase()
        })
      });

      if (!response.ok) {
        setPantryError(await readApiError(response));
        return;
      }

      handleCancelEditing();
      setPantryMessage("Updated in the local database.");
      await loadPantryItems();
    } catch {
      setPantryError("Could not update that ingredient.");
    } finally {
      setIsUpdatingPantryItem(false);
    }
  }

  function handleAddRecipeIngredientDraft() {
    setRecipeIngredientDrafts((currentDrafts) => [
      ...currentDrafts,
      { id: crypto.randomUUID(), ingredient: "", quantity: "", unit: "" }
    ]);
  }

  function handleRemoveRecipeIngredientDraft(draftId: string) {
    setRecipeIngredientDrafts((currentDrafts) =>
      currentDrafts.length === 1
        ? [{ id: crypto.randomUUID(), ingredient: "", quantity: "", unit: "" }]
        : currentDrafts.filter((draft) => draft.id !== draftId)
    );
  }

  function handleUpdateRecipeIngredientDraft(
    draftId: string,
    field: keyof Omit<RecipeIngredientDraft, "id">,
    value: string
  ) {
    setRecipeIngredientDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, [field]: value } : draft))
    );
  }

  function resetRecipeForm(form?: HTMLFormElement | null) {
    form?.reset();
    setEditingRecipeId(null);
    setEditingRecipeImagePath(null);
    setRecipeTitleDraft("");
    setRecipeDescriptionDraft("");
    setRecipeUrlDraft("");
    setRecipePhotoDraft(null);
    setRecipeIngredientDrafts([{ id: crypto.randomUUID(), ingredient: "", quantity: "", unit: "" }]);
  }

  function handleStartEditingRecipe(recipe: Recipe) {
    setEditingRecipeId(recipe.id);
    setEditingRecipeImagePath(recipe.image_path);
    setRecipeTitleDraft(recipe.title);
    setRecipeDescriptionDraft(recipe.description ?? "");
    setRecipeUrlDraft(recipe.source_url ?? "");
    setRecipePhotoDraft(null);
    setRecipeIngredientDrafts(
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            id: ingredient.id,
            ingredient: ingredient.ingredient,
            quantity: ingredient.quantity === null ? "" : String(ingredient.quantity),
            unit: ingredient.unit ?? ""
          }))
        : [{ id: crypto.randomUUID(), ingredient: "", quantity: "", unit: "" }]
    );
    setRecipeError("");
    setRecipeMessage("Editing recipe. Save changes when you're ready.");
    window.setTimeout(() => recipeFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function handleCancelRecipeEditing() {
    resetRecipeForm(recipeFormRef.current);
    setRecipeError("");
    setRecipeMessage("");
  }

  async function handleSaveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingRecipeRef.current) {
      return;
    }

    const ingredients = recipeIngredientDrafts
      .map((draft) => ({
        ingredient: normalizeIngredient(draft.ingredient),
        quantity: draft.quantity.trim() === "" ? null : Number(draft.quantity),
        unit: draft.unit.trim() === "" ? null : draft.unit.trim().toLowerCase()
      }))
      .filter((ingredient) => ingredient.ingredient);

    if (!recipeTitleDraft.trim()) {
      setRecipeError("Add a recipe title.");
      return;
    }

    if (!recipeDescriptionDraft.trim()) {
      setRecipeError("Add a recipe description.");
      return;
    }

    if (ingredients.length === 0) {
      setRecipeError("Add at least one recipe ingredient.");
      return;
    }

    if (ingredients.some((ingredient) => ingredient.quantity !== null && Number.isNaN(ingredient.quantity))) {
      setRecipeError("Enter valid ingredient amounts or leave them blank.");
      return;
    }

    isSavingRecipeRef.current = true;
    setIsSavingRecipe(true);
    setRecipeError("");
    setRecipeMessage("Saving recipe...");

    try {
      const form = event.currentTarget;
      const formData = new FormData();
      formData.append("title", recipeTitleDraft.trim());
      formData.append("description", recipeDescriptionDraft.trim());
      formData.append("sourceUrl", recipeUrlDraft.trim());
      formData.append("ingredients", JSON.stringify(ingredients));

      if (recipePhotoDraft) {
        formData.append("photo", recipePhotoDraft);
      }

      const response = await fetch(editingRecipeId ? `/api/recipes/${editingRecipeId}` : "/api/recipes", {
        method: editingRecipeId ? "PATCH" : "POST",
        body: formData
      });

      if (!response.ok) {
        setRecipeError(await readApiError(response));
        setRecipeMessage("");
        return;
      }

      const body = (await response.json()) as { recipe: Recipe | null };

      if (!body.recipe) {
        setRecipeError("Recipe saved, but Foodali could not read it back yet. Refreshing recipes...");
        setRecipeMessage("");
        await loadRecipes();
        return;
      }

      const savedRecipe = body.recipe;
      setRecipes((currentRecipes) =>
        editingRecipeId
          ? currentRecipes.map((recipe) => (recipe.id === savedRecipe.id ? savedRecipe : recipe))
          : [savedRecipe, ...currentRecipes.filter((recipe) => recipe.id !== savedRecipe.id)]
      );
      resetRecipeForm(form);
      setRecipeMessage(editingRecipeId ? "Recipe updated in the local database." : "Recipe saved to the local database.");
    } catch {
      setRecipeError("Could not save that recipe.");
      setRecipeMessage("");
    } finally {
      isSavingRecipeRef.current = false;
      setIsSavingRecipe(false);
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    setRecipeError("");
    setRecipeMessage("");

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });

      if (!response.ok) {
        setRecipeError(await readApiError(response));
        return;
      }

      setRecipeMessage("Recipe removed from the local database.");
      await loadRecipes();
    } catch {
      setRecipeError("Could not remove that recipe.");
    }
  }

  const pantryCount = pantryItems.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            Foodali local
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight text-foreground lg:text-7xl">
              Keep track of what&apos;s in your kitchen and decide what to cook faster.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground lg:text-xl">
              Save recipe links, manually add ingredients from TikTok or Instagram, and instantly see
              what you can make or what you still need to buy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Ingredients tracked</div>
              <div className="text-2xl font-semibold text-foreground">{pantryCount}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Recipes ready</div>
              <div className="text-2xl font-semibold text-foreground">{makeableRecipes.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Storage status</div>
              <div className="text-2xl font-semibold text-foreground">SQLite</div>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border bg-foreground p-6 text-background shadow-soft">
          <div className="text-sm uppercase tracking-[0.24em] text-background/70">Local database</div>
          <div className="mt-4 space-y-4">
            <p className="font-[family-name:var(--font-display)] text-3xl leading-tight">
              Private pantry, saved on this machine.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-background/80">
              Foodali writes to <span className="font-medium text-background">data/foodali.sqlite</span> through local API routes.
            </div>
            <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-background">
              <Database className="h-4 w-4" />
              No sign-in required
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-background/80">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Pantry items with quantities</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Recipe and ingredient tables ready</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Local-only storage by default</div>
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Ingredients at home</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add what you have and store how much of it is left in the local database.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Auto-saved locally
            </div>
          </div>

          <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_140px_140px_auto]" onSubmit={handleAddIngredient}>
            <label className="block sm:col-span-1">
              <span className="sr-only">Ingredient name</span>
              <input
                type="text"
                value={ingredientDraft}
                onChange={(event) => setIngredientDraft(event.target.value)}
                placeholder="Ingredient"
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>
            <label className="block">
              <span className="sr-only">Quantity</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quantityDraft}
                onChange={(event) => setQuantityDraft(event.target.value)}
                placeholder="Amount"
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>
            <label className="block">
              <span className="sr-only">Unit</span>
              <input
                type="text"
                value={unitDraft}
                onChange={(event) => setUnitDraft(event.target.value)}
                placeholder="Unit"
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>
            <button
              type="submit"
              disabled={isSavingPantryItem}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {pantryItems.length > 0 ? (
              pantryItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                  {editingItemId === item.id ? (
                    <form className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto_auto]" onSubmit={(event) => handleUpdateIngredient(event, item.id)}>
                      <label className="block">
                        <span className="sr-only">Ingredient name</span>
                        <input
                          type="text"
                          value={editIngredientDraft}
                          onChange={(event) => setEditIngredientDraft(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Quantity</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editQuantityDraft}
                          onChange={(event) => setEditQuantityDraft(event.target.value)}
                          placeholder="Amount"
                          className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Unit</span>
                        <input
                          type="text"
                          value={editUnitDraft}
                          onChange={(event) => setEditUnitDraft(event.target.value)}
                          placeholder="Unit"
                          className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isUpdatingPantryItem}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditing}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.ingredient}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatQuantity(item.quantity, item.unit) || "No quantity set"}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditing(item)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                          aria-label={`Edit ${item.ingredient}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(item.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                          aria-label={`Remove ${item.ingredient}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  {item.notes && editingItemId !== item.id ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                </article>
              ))
            ) : isLoadingPantry ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Loading pantry from the local database...
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No ingredients saved yet.
              </div>
            )}
          </div>

          {(pantryError || pantryMessage) && (
            <div className="mt-5 rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {pantryError || pantryMessage}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">
                {editingRecipeId ? "Edit recipe" : "Save a recipe"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {editingRecipeId
                  ? "Update the recipe details, ingredients, source, or photo."
                  : "Add the ingredient list now so Foodali can match it against your pantry later."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              {recipes.length} saved
            </div>
          </div>

          <form ref={recipeFormRef} className="mt-6 space-y-4" onSubmit={handleSaveRecipe}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Recipe title</span>
              <input
                type="text"
                value={recipeTitleDraft}
                onChange={(event) => setRecipeTitleDraft(event.target.value)}
                placeholder="Creamy tomato pasta"
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Description</span>
              <textarea
                value={recipeDescriptionDraft}
                onChange={(event) => setRecipeDescriptionDraft(event.target.value)}
                placeholder="Fast weeknight dinner with pantry pasta, tomato, and parmesan."
                rows={4}
                className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Source URL</span>
                <div className="relative">
                  <Link className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="url"
                    value={recipeUrlDraft}
                    onChange={(event) => setRecipeUrlDraft(event.target.value)}
                    placeholder="https://..."
                    className="h-12 w-full rounded-2xl border border-input bg-background pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Photo</span>
                <span className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-input bg-background px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted">
                  <Camera className="h-4 w-4" />
                  {recipePhotoDraft ? "New photo selected" : editingRecipeImagePath ? "Keep current photo" : "Choose photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setRecipePhotoDraft(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </span>
              </label>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Ingredients</h3>
                <button
                  type="button"
                  onClick={handleAddRecipeIngredientDraft}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  Row
                </button>
              </div>

              {recipeIngredientDrafts.map((draft) => (
                <div key={draft.id} className="grid gap-2 sm:grid-cols-[1fr_110px_110px_auto]">
                  <input
                    type="text"
                    value={draft.ingredient}
                    onChange={(event) => handleUpdateRecipeIngredientDraft(draft.id, "ingredient", event.target.value)}
                    placeholder="Ingredient"
                    className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.quantity}
                    onChange={(event) => handleUpdateRecipeIngredientDraft(draft.id, "quantity", event.target.value)}
                    placeholder="Amount"
                    className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <input
                    type="text"
                    value={draft.unit}
                    onChange={(event) => handleUpdateRecipeIngredientDraft(draft.id, "unit", event.target.value)}
                    placeholder="Unit"
                    className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipeIngredientDraft(draft.id)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-white px-3 text-muted-foreground transition hover:bg-muted"
                    aria-label="Remove ingredient row"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSavingRecipe}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSavingRecipe
                ? editingRecipeId
                  ? "Updating recipe..."
                  : "Saving recipe..."
                : editingRecipeId
                  ? "Update recipe"
                  : "Save recipe"}
            </button>
            {editingRecipeId ? (
              <button
                type="button"
                onClick={handleCancelRecipeEditing}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" />
                Cancel editing
              </button>
            ) : null}
          </form>

          {(recipeError || recipeMessage) && (
            <div className="mt-5 rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {recipeError || recipeMessage}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Saved recipes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Foodali checks these against your pantry by ingredient name.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {makeableRecipes.length} ready now
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {recipes.length > 0 ? (
            recipes.map((recipe) => {
              const missingIngredients = recipe.ingredients.filter(
                (ingredient) => !pantryIngredientSet.has(normalizeIngredient(ingredient.ingredient))
              );
              const isMakeable = missingIngredients.length === 0;

              return (
                <article key={recipe.id} className="overflow-hidden rounded-2xl border border-border/80 bg-background">
                  {recipe.image_path ? (
                    <div className="relative h-48 w-full">
                      <Image
                        src={recipe.image_path}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{recipe.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{recipe.description}</p>
                      </div>
                      <span className={isMakeable ? "shrink-0 text-sm font-medium text-emerald-700" : "shrink-0 text-sm font-medium text-amber-700"}>
                        {isMakeable ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            Ready
                          </span>
                        ) : (
                          `${missingIngredients.length} missing`
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recipe.ingredients.map((ingredient) => (
                        <span
                          key={ingredient.id}
                          className={
                            pantryIngredientSet.has(normalizeIngredient(ingredient.ingredient))
                              ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-800"
                              : "rounded-full border border-border bg-white px-3 py-1 text-sm text-muted-foreground"
                          }
                        >
                          {formatIngredientAmount(ingredient)
                            ? `${formatIngredientAmount(ingredient)} ${ingredient.ingredient}`
                            : ingredient.ingredient}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {recipe.source_url ? (
                        <a
                          href={recipe.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {recipe.source_type ?? "Open source"}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Manual entry</span>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditingRecipe(recipe)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                          aria-label={`Edit ${recipe.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipe(recipe.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                          aria-label={`Remove ${recipe.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : isLoadingRecipes ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Loading recipes from the local database...
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              No recipes saved yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
