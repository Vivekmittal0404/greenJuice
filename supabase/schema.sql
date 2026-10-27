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
  payment_method text not null default 'razorpay' check (payment_method in ('upi', 'razorpay', 'cod')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'cancelled')),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists payment_method text not null default 'razorpay';

alter table public.orders
  alter column payment_method set default 'razorpay',
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  drop constraint if exists orders_payment_method_check,
  add constraint orders_payment_method_check
    check (payment_method in ('upi', 'razorpay', 'cod'));

alter table public.orders enable row level security;
grant usage on schema public to service_role;
grant select, insert, update on table public.orders to service_role;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create unique index if not exists orders_razorpay_order_id_idx
  on public.orders (razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists orders_razorpay_payment_id_idx
  on public.orders (razorpay_payment_id) where razorpay_payment_id is not null;

notify pgrst, 'reload schema';
