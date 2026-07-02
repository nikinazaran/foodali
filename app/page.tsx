const pantryIngredients = ["eggs", "rice", "garlic", "olive oil", "parmesan", "spinach"];

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

export default function Home() {
  const makeableRecipes = recipes.filter((recipe) =>
    recipe.ingredients.every((ingredient) =>
      pantryIngredients.some((storedIngredient) => storedIngredient === ingredient)
    )
  );

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
              <div className="text-2xl font-semibold text-foreground">{pantryIngredients.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Recipes ready</div>
              <div className="text-2xl font-semibold text-foreground">{makeableRecipes.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Random pick</div>
              <div className="text-2xl font-semibold text-foreground">Coming next</div>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border bg-foreground p-6 text-background shadow-soft">
          <div className="text-sm uppercase tracking-[0.24em] text-background/70">Today&apos;s goal</div>
          <p className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight">
            Pick a recipe, see what you have, and shop only for the missing pieces.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-background/80">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Save links from social apps</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Track ingredients you already own</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Find recipes you can make now</div>
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Ingredients at home</h2>
          <p className="mt-2 text-sm text-muted-foreground">This is the starting pantry list for the scaffold.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {pantryIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-secondary-foreground"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Recipes you can make now</h2>
          <p className="mt-2 text-sm text-muted-foreground">The full experience will use your real saved recipes and pantry data.</p>
          <div className="mt-5 space-y-3">
            {recipes.map((recipe) => {
              const isMakeable = recipe.ingredients.every((ingredient) =>
                pantryIngredients.some((storedIngredient) => storedIngredient === ingredient)
              );

              return (
                <article key={recipe.title} className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{recipe.title}</h3>
                      <p className="text-sm text-muted-foreground">{recipe.source}</p>
                    </div>
                    <span className={isMakeable ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-amber-700"}>
                      {isMakeable ? "Ready" : "Missing items"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{recipe.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}