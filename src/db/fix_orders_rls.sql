
-- Enable RLS (ensure it's on)
alter table orders enable row level security;

-- Drop existing policies to ensure clean slate
drop policy if exists "Enable insert for everyone" on orders;
drop policy if exists "Enable read access for service role only" on orders;
drop policy if exists "Enable insert for public" on orders;
drop policy if exists "Enable select for public" on orders;

-- Create broad insert policy for public/anon users
create policy "Enable insert for public"
on orders for insert
to public
with check (true);

-- Create broad select policy for public/anon users (DEV ONLY: allows verifying order creation)
create policy "Enable select for public"
on orders for select
to public
using (true);
