-- Enable RLS
alter table listings enable row level security;

-- Drop existing policies
drop policy if exists "Enable read access for all users" on listings;
drop policy if exists "Enable insert for all users" on listings;
drop policy if exists "Enable update for all users" on listings;
drop policy if exists "Enable delete for all users" on listings;
drop policy if exists "Enable select for public" on listings;

-- SECURE POLICIES
-- 1. Public Read (Storefront needs this)
create policy "Public Read Access" 
on listings for select 
to public 
using (true);

-- 2. Authenticated Write Access (Admin Dashboard needs this)
create policy "Admin Insert Access" 
on listings for insert 
to authenticated 
with check (true);

create policy "Admin Update Access" 
on listings for update 
to authenticated 
using (true);

create policy "Admin Delete Access" 
on listings for delete 
to authenticated 
using (true);
