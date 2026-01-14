-- Create the listings table
create table public.listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  price numeric not null,
  service_fee numeric not null,
  store text not null,
  condition text not null,
  image_url text, -- We'll store the URL string
  link text,
  year text,
  make text,
  model text,
  part_name text,
  
  -- Add a search index for faster filtering
  constraint listings_price_check check (price >= 0)
);

-- Enable Row Level Security (RLS)
alter table public.listings enable row level security;

-- Create a policy that allows anyone to read listings (Public Read)
create policy "Allow public read access"
  on public.listings
  for select
  to public
  using (true);

-- Create a policy that allows authenticated users (service role) to insert (for seeding)
create policy "Allow service role insert"
  on public.listings
  for insert
  to service_role
  with check (true);
