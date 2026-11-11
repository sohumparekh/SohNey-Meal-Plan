# Ghar ka Menu

A small private app for one household: a 4-week rotating vegetarian menu, weekly shopping
lists that come straight from the menu, and a WhatsApp message for the cook every night
with tomorrow's meals, a Plan B for each, and any soaking or prep to do tonight.

**Goal:** the cook never has to call in the evening to ask what to make, and the
ingredients are always at home.

## How it works

- **Week = Saturday to Friday.** The weekly order is picked up from the office grocer on
  Friday evening, after the cook has already made Friday's dinner, so fresh food is
  available from Saturday. Fragile items (palak, methi, mushrooms, pav, paneer) are
  planned early in the week; hardy dishes later. An optional Tuesday top-up covers
  fragile items needed Wednesday to Friday.
- **Two kinds of ingredients.** Staples (atta, dal, oil, spices, onion, potato...) are
  never counted: they come back on a restock cycle, or when someone taps "running low".
  Fresh and specialty items are computed exactly from the approved menu and rounded to
  what the shop sells.
- **Rotation, not optimisation.** The 105-dish library and the 28-day rotation are in
  `src/lib/seed/`. Each Thursday the app drafts next week from the rotation (swapping out
  anything eaten recently or rated badly). We swap what we like and approve.
- **The cook only uses WhatsApp.** Phase 1: the app prepares the message and opens
  WhatsApp with it filled in; we tap Send. Phase 2 (later) can send by itself through
  the WhatsApp Business Cloud API; see `docs/phase-2-whatsapp.md`.

## Screens

| Tab | What it's for |
|---|---|
| Today | Today's three meals (swap, eating out, Plan B, servings, rate), tomorrow's menu with the big "Send to cook" button, and a box to paste the cook's reply ("paneer khatam") |
| Week | All 21 meals of a week on one screen. Tap to swap from 5 suggestions, then Approve |
| Shopping | Shubham (call / show at counter / copy), Blinkit (with search links), Top-up, Staples |
| Dishes | Library, search, turn dishes on/off, add new dishes from a link or a name (Claude drafts it) |
| Settings | Cook and grocer numbers, reminder times, notifications, message log |

## Tech

Next.js 15 (App Router) + TypeScript + Tailwind 4, Postgres (Supabase), web push, Claude
API (Haiku 5.5) for drafting dishes only. The planner is plain TypeScript in
`src/lib/core/` with unit tests (`npm test`).

```
src/lib/seed/        dish library, ingredient master, rotation.json
src/lib/core/        planner: dates, shelf life, draft, suggestions, shopping, eating out, cook messages
src/lib/db/          schema, idempotent setup + seed, data access
src/lib/jobs.ts      scheduled jobs (draft, reminders, top-up check)
src/lib/messaging.ts cook channel: wa.me link now, Cloud API later
src/app/             screens, server actions, API routes
scripts/             rotation generator, local DB setup
```

## Setup (about 20 minutes, once)

1. **Supabase**: create a free project (region: Mumbai). Project Settings, Database,
   copy the **Transaction pooler** connection string (port 6543).
2. **Secrets**: make three long random strings (`openssl rand -hex 24`) for
   `SESSION_SECRET`, `CRON_SECRET`, and choose a `HOUSEHOLD_PASSCODE`. Generate push keys
   with `npx web-push generate-vapid-keys`. Get an Anthropic API key.
3. **Vercel**: import this GitHub repo, add the variables from `.env.example`, deploy.
4. **Database**: create tables and load the dishes (safe to repeat):
   `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP.vercel.app/api/setup`
5. **Reminders**: in the Supabase SQL editor run `supabase/cron.sql` after putting in
   your app URL and `CRON_SECRET`.
6. **Phones**: open the app URL, enter the passcode, Add to Home Screen, open it from the
   Home Screen, then Settings, Turn on notifications (iPhone needs iOS 16.4 or later and
   the Home Screen app for this). Put the cook's WhatsApp number in Settings.

## Local development

```
cp .env.example .env.local      # point DATABASE_URL at a local Postgres
npm install
npm run db:setup
npm run dev
npm test                        # planner unit tests
npm run rotation                # regenerate the 4-week rotation (writes docs/rotation-draft.md)
```

## Maintenance

None expected. The 15-minute database cron keeps the free Supabase project active,
prunes old logs, and makes sure the current week always exists. If the cook gets a new
number or reminder times change, edit them in Settings.
