# foodali

Foodali is a personal meal-planning app for deciding what to cook with the ingredients already at home.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase

## Local setup

1. Install dependencies.
2. Copy `.env.example` to `.env.local` and fill in your Supabase values.
3. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor to create the pantry tables, recipe tables, row-level security policies, and the `recipe-images` bucket.
4. Run the app with `npm run dev`.

## What's in this scaffold

- A Next.js App Router setup
- A starter landing page with the core Foodali concepts
- Tailwind and shadcn-ready config
- Supabase auth, database, and storage wiring for pantry data
