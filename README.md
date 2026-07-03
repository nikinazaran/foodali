# foodali

Foodali is a personal meal-planning app for deciding what to cook with the ingredients already at home.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Local SQLite database

## Local setup

1. Install dependencies.
2. Run the app with `npm run dev`.
3. Open the app and add pantry items or recipes. Foodali creates `data/foodali.sqlite` automatically the first time the API reads or writes data.

## What's in this scaffold

- A Next.js App Router setup
- A starter landing page with the core Foodali concepts
- Tailwind and shadcn-ready config
- Local API routes backed by SQLite for pantry and recipe data

## Database

The local database creates tables for pantry items, recipes, and recipe ingredients. Uploaded recipe photos are saved under `public/uploads/recipes`, and both `data/` and `public/uploads/` are ignored by git because they are local app data.
