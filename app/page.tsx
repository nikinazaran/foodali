"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Check, LogOut, Plus, Trash2 } from "lucide-react";
import { type Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";

type PantryItem = {
  id: string;
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
};

const recipes = [
  {
    title: "Garlic Parmesan Fried Rice",
    source: "Saved from TikTok",
    ingredients: ["rice", "garlic", "eggs", "parmesan", "olive oil"],
    note: "You have everything for this one."
  },
  {
    title: "Spinach Feta Wrap",
    source: "Saved from Instagram",
    ingredients: ["spinach", "feta", "tortilla", "olive oil"],
    note: "Missing 2 ingredients."
  },
  {
    title: "Quick Pantry Pasta",
    source: "Manual entry",
    ingredients: ["garlic", "olive oil", "parmesan", "pasta"],
    note: "You can make this tonight."
  }
];

function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity === null) {
    return unit ? unit : "";
  }

  return unit ? `${quantity} ${unit}` : `${quantity}`;
}

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [quantityDraft, setQuantityDraft] = useState("");
  const [unitDraft, setUnitDraft] = useState("");
  const [pantryMessage, setPantryMessage] = useState("");
  const [pantryError, setPantryError] = useState("");
  const [isLoadingPantry, setIsLoadingPantry] = useState(false);
  const [isSavingPantryItem, setIsSavingPantryItem] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      setPantryItems([]);
      return;
    }

    void loadPantryItems();
  }, [supabase, session]);

  const pantryIngredientSet = useMemo(
    () => new Set(pantryItems.map((item) => normalizeIngredient(item.ingredient))),
    [pantryItems]
  );

  const makeableRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.ingredients.every((ingredient) => pantryIngredientSet.has(ingredient))),
    [pantryIngredientSet]
  );

  async function loadPantryItems() {
    if (!supabase) {
      return;
    }

    setIsLoadingPantry(true);
    setPantryError("");

    const { data, error } = await supabase
      .from("pantry_items")
      .select("id, ingredient, quantity, unit, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setPantryError(error.message);
      setPantryItems([]);
    } else {
      setPantryItems((data ?? []) as PantryItem[]);
    }

    setIsLoadingPantry(false);
  }

  async function handleSendLoginLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthError("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first.");
      return;
    }

    setIsSendingLink(true);
    setAuthError("");
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage("Check your email for the sign-in link.");
      setAuthEmail("");
    }

    setIsSendingLink(false);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  async function handleAddIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !session) {
      setPantryError("Sign in first so your pantry can be saved to Supabase.");
      return;
    }

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

    const { error } = await supabase.from("pantry_items").insert({
      ingredient,
      quantity: quantityValue,
      unit: unitDraft.trim() === "" ? null : unitDraft.trim().toLowerCase()
    });

    if (error) {
      setPantryError(error.message);
    } else {
      setIngredientDraft("");
      setQuantityDraft("");
      setUnitDraft("");
      setPantryMessage("Saved to Supabase.");
      await loadPantryItems();
    }

    setIsSavingPantryItem(false);
  }

  async function handleRemoveIngredient(itemId: string) {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("pantry_items").delete().eq("id", itemId);

    if (error) {
      setPantryError(error.message);
      return;
    }

    setPantryMessage("Removed from Supabase.");
    await loadPantryItems();
  }

  const pantryCount = pantryItems.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            Foodali setup
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
              <div className="text-2xl font-semibold text-foreground">Supabase</div>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border bg-foreground p-6 text-background shadow-soft">
          <div className="text-sm uppercase tracking-[0.24em] text-background/70">Account</div>
          {session ? (
            <div className="mt-4 space-y-4">
              <p className="font-[family-name:var(--font-display)] text-3xl leading-tight">Signed in</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-background/80">
                {session.user.email}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-background transition hover:bg-white/15"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSendLoginLink}>
              <p className="font-[family-name:var(--font-display)] text-3xl leading-tight">Sign in to save your pantry</p>
              <label className="block">
                <span className="mb-2 block text-sm text-background/70">Email address</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-background outline-none transition placeholder:text-background/40 focus:border-white/30"
                />
              </label>
              <button
                type="submit"
                disabled={isSendingLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send login link
              </button>
              <p className="text-sm text-background/70">Magic-link auth gives you Supabase-backed pantry data per account.</p>
            </form>
          )}

          <div className="mt-6 space-y-3 text-sm text-background/80">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">PostgreSQL pantry items with quantities</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Supabase Auth for account-specific data</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Storage bucket ready for recipe images</div>
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Ingredients at home</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add what you have and store how much of it is left in Supabase.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Auto-saved per account
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
            {session ? (
              pantryItems.length > 0 ? (
                pantryItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.ingredient}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatQuantity(item.quantity, item.unit) || "No quantity set"}
                        </p>
                      </div>
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
                    {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                  </article>
                ))
              ) : isLoadingPantry ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Loading pantry from Supabase...
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No ingredients saved yet.
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Sign in to store your pantry in Supabase.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Recipes you can make now</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This still uses the starter recipe list, but it now checks against your real pantry data.
          </p>
          <div className="mt-5 space-y-3">
            {recipes.map((recipe) => {
              const isMakeable = recipe.ingredients.every((ingredient) => pantryIngredientSet.has(ingredient));

              return (
                <article key={recipe.title} className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{recipe.title}</h3>
                      <p className="text-sm text-muted-foreground">{recipe.source}</p>
                    </div>
                    <span className={isMakeable ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-amber-700"}>
                      {isMakeable ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Ready
                        </span>
                      ) : (
                        "Missing items"
                      )}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{recipe.note}</p>
                </article>
              );
            })}
          </div>

          {(authError || authMessage || pantryError || pantryMessage) && (
            <div className="mt-5 rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {authError || pantryError || authMessage || pantryMessage}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}