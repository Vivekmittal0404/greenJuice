-- JuiceWala Customer Reviews Table for Standard Delivery & Website
create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default 'Bhiwani',
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- Policies: allow everyone to read and submit reviews
create policy "Allow public read reviews"
  on public.reviews
  for select
  using (true);

create policy "Allow public insert reviews"
  on public.reviews
  for insert
  with check (true);

-- Permissions
grant usage on schema public to anon, authenticated, service_role;
grant select, insert on table public.reviews to anon, authenticated, service_role;

-- Index for chronological ordering
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

notify pgrst, 'reload schema';
