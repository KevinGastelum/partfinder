-- Create orders table to track user purchases and fulfillment status
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  listing_id uuid references listings(id),
  status text default 'pending', -- pending, paid, fulfilling, shipped, failed
  stripe_payment_id text,
  shipping_address jsonb, -- Stores { name, line1, city, state, postal_code, country }
  
  -- Financials
  item_price numeric not null,
  service_fee numeric not null,
  shipping_cost numeric default 0,
  total_amount numeric not null,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table orders enable row level security;

-- Policies
-- 1. Users can see their own orders (we track by email for guest checkout for now, or session)
--    Note: For guest checkout without auth, RLS is tricky. 
--    For this MVP, we might allow 'insert' by public (anon) and 'select' by service role only 
--    unless we implement a proper auth system. 
--    Let's allow Anon Insert for now.

create policy "Enable insert for everyone" 
on orders for insert 
with check (true);

create policy "Enable read access for service role only" 
on orders for select 
using (auth.role() = 'service_role');
