// Database schema. Idempotent: safe to run on every deploy.
//
// Row level security is switched on for every table with NO policies. The app talks to
// Postgres directly from the server, which bypasses RLS, while Supabase's public REST
// API (anon key) can read nothing.

export const SCHEMA_SQL = /* sql */ `
create table if not exists ingredients (
  id text primary key,
  name_en text not null,
  name_cook text not null,
  category text not null check (category in ('staple','fresh','specialty')),
  source text not null check (source in ('grocer','blinkit','either')),
  unit text not null,
  pack numeric not null,
  pack_label text not null,
  shelf_life_days int not null,
  restock_days int,
  restock_qty text
);

create table if not exists dishes (
  id text primary key,
  name_en text not null,
  name_cook text not null,
  slots text[] not null,
  cuisine text not null,
  effort text not null,
  kind text not null,
  ingredients jsonb not null,
  prep_ahead jsonb,
  plan_b_id text not null,
  recipe_cook text,
  rating int not null default 0,
  last_cooked_at date,
  active boolean not null default true,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists rotation (
  week_no int not null,
  day_idx int not null,
  slot text not null,
  dish_id text not null,
  primary key (week_no, day_idx, slot)
);

create table if not exists weeks (
  week_start date primary key,
  rotation_week int not null,
  status text not null default 'draft',
  approved_at timestamptz,
  pickup_done_at timestamptz
);

create table if not exists meals (
  date date not null,
  slot text not null,
  dish_id text not null,
  servings int not null default 2,
  status text not null default 'planned',
  plan_b boolean not null default false,
  original_dish_id text,
  updated_at timestamptz not null default now(),
  primary key (date, slot)
);

create table if not exists shopping_ticks (
  week_start date not null,
  list text not null,
  ingredient_id text not null,
  ticked_at timestamptz not null default now(),
  primary key (week_start, list, ingredient_id)
);

create table if not exists staples (
  ingredient_id text primary key,
  last_bought date,
  low_reported_at timestamptz
);

create table if not exists missing_items (
  id serial primary key,
  date date not null,
  ingredient_id text not null,
  resolved boolean not null default false,
  reported_at timestamptz not null default now()
);

create table if not exists cook_messages (
  id serial primary key,
  direction text not null check (direction in ('out','in')),
  kind text not null,
  for_date date,
  text text not null,
  snapshot jsonb,
  parsed_intent jsonb,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists job_runs (
  job text not null,
  run_key text not null,
  ran_at timestamptz not null default now(),
  primary key (job, run_key)
);

do $$
declare t text;
begin
  foreach t in array array['ingredients','dishes','rotation','weeks','meals','shopping_ticks','staples',
    'missing_items','cook_messages','settings','push_subscriptions','job_runs'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
`;
