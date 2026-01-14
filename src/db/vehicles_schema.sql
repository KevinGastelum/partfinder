-- Create the vehicles table to store the Year/Make/Model hierarchy
create table if not exists vehicles (
  id uuid default gen_random_uuid() primary key,
  year integer not null,
  make text not null,
  model text not null,      -- e.g. "Civic"
  submodel text,            -- e.g. "EX-L" (Trim)
  engine text,              -- e.g. "1.5L Turbo"
  
  -- Composite display name for the dropdown
  model_display_name text generated always as (
    model || coalesce(' ' || submodel, '')
  ) stored,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for fast cascading lookups
create index if not exists idx_vehicles_year on vehicles(year);
create index if not exists idx_vehicles_make on vehicles(make);
create index if not exists idx_vehicles_year_make on vehicles(year, make);

-- Enable RLS (Read-only for public, Admin write)
alter table vehicles enable row level security;

create policy "Enable read access for all users"
on vehicles for select
using (true);

create policy "Enable insert for service role only"
on vehicles for insert
with check (auth.role() = 'service_role');
