-- Enable RLS
alter table listings enable row level security;

-- Drop existing policies to clean up
drop policy if exists "Enable read access for all users" on listings;
drop policy if exists "Enable insert for all users" on listings;
drop policy if exists "Enable update for all users" on listings;
drop policy if exists "Enable delete for all users" on listings;
drop policy if exists "Enable select for public" on listings;

-- Create full access policies for public (DEV MODE ONLY)
-- This allows the Admin Dashboard (running locally without admin auth) to Manage Inventory
create policy "Enable read access for all users" on listings for select to public using (true);
create policy "Enable insert for all users" on listings for insert to public with check (true);
create policy "Enable update for all users" on listings for update to public using (true);
create policy "Enable delete for all users" on listings for delete to public using (true);
