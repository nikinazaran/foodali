create extension if not exists "pgcrypto";

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingredient text not null,
  quantity numeric,
  unit text,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.pantry_items enable row level security;

create policy "Users can read their pantry items"
  on public.pantry_items
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their pantry items"
  on public.pantry_items
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their pantry items"
  on public.pantry_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their pantry items"
  on public.pantry_items
  for delete
  using (auth.uid() = user_id);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  source_url text,
  source_type text,
  notes text,
  image_path text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.recipes enable row level security;

create policy "Users can read their recipes"
  on public.recipes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their recipes"
  on public.recipes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their recipes"
  on public.recipes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their recipes"
  on public.recipes
  for delete
  using (auth.uid() = user_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient text not null,
  quantity numeric,
  unit text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.recipe_ingredients enable row level security;

create policy "Users can read recipe ingredients for their recipes"
  on public.recipe_ingredients
  for select
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

create policy "Users can insert recipe ingredients for their recipes"
  on public.recipe_ingredients
  for insert
  with check (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

create policy "Users can update recipe ingredients for their recipes"
  on public.recipe_ingredients
  for update
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

create policy "Users can delete recipe ingredients for their recipes"
  on public.recipe_ingredients
  for delete
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;

create policy "Users can read their recipe images"
  on storage.objects
  for select
  using (bucket_id = 'recipe-images' and owner = auth.uid());

create policy "Users can upload their recipe images"
  on storage.objects
  for insert
  with check (bucket_id = 'recipe-images' and owner = auth.uid());

create policy "Users can update their recipe images"
  on storage.objects
  for update
  using (bucket_id = 'recipe-images' and owner = auth.uid())
  with check (bucket_id = 'recipe-images' and owner = auth.uid());

create policy "Users can delete their recipe images"
  on storage.objects
  for delete
  using (bucket_id = 'recipe-images' and owner = auth.uid());
