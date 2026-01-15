-- Enable RLS
alter table listings enable row level security;

-- Drop ALL existing policies to avoid conflicts
drop policy if exists "Enable read access for all users" on listings;
drop policy if exists "Enable insert for all users" on listings;
drop policy if exists "Enable update for all users" on listings;
drop policy if exists "Enable delete for all users" on listings;
drop policy if exists "Enable select for public" on listings;
drop policy if exists "Public Read Access" on listings;
drop policy if exists "Admin Select Access" on listings;
drop policy if exists "Admin Insert Access" on listings;
drop policy if exists "Admin Update Access" on listings;
drop policy if exists "Admin Delete Access" on listings;
drop policy if exists "Allow public read access" on listings;
drop policy if exists "Allow service role insert" on listings;

-- SECURE POLICIES

-- 1. Public Read Access (Required for the main store to show items)
create policy "Public Read Access" 
on listings for select 
to public 
using (true);

-- 2. Admin Select Access (Explicitly allows logged-in users to see items)
create policy "Admin Select Access" 
on listings for select 
to authenticated 
using (true);

-- 3. Admin Insert Access
create policy "Admin Insert Access" 
on listings for insert 
to authenticated 
with check (true);

-- 4. Admin Update Access
create policy "Admin Update Access" 
on listings for update 
to authenticated 
using (true);

-- 5. Admin Delete Access
create policy "Admin Delete Access" 
on listings for delete 
to authenticated 
using (true);
