create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key,
  customer_name text not null,
  phone text not null,
  address text not null,
  items jsonb not null,
  subtotal_inr integer not null check (subtotal_inr > 0),
  delivery_fee_inr integer not null check (delivery_fee_inr >= 0),
  amount_inr integer not null check (amount_inr > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
grant usage on schema public to service_role;
grant select, insert on table public.orders to service_role;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
