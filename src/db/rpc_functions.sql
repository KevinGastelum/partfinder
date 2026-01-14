-- RPC Functions for Cascading Vehicle Selector

-- 1. Get Distinct Years
create or replace function get_years()
returns table (year integer)
language sql stable
as $$
  select distinct year from vehicles order by year desc;
$$;

-- 2. Get Makes for a selected Year
create or replace function get_makes(selected_year integer)
returns table (make text)
language sql stable
as $$
  select distinct make 
  from vehicles 
  where year = selected_year 
  order by make asc;
$$;

-- 3. Get Models (Display Name) for a selected Year + Make
create or replace function get_models(selected_year integer, selected_make text)
returns table (model text)
language sql stable
as $$
  select distinct model_display_name as model
  from vehicles 
  where year = selected_year 
  and make = selected_make 
  order by model asc;
$$;

-- 4. Get Engines (Optional, if we have them) for completeness
create or replace function get_engines(selected_year integer, selected_make text, selected_model text)
returns table (engine text)
language sql stable
as $$
  select distinct engine
  from vehicles 
  where year = selected_year 
  and make = selected_make 
  and model_display_name = selected_model
  order by engine asc;
$$;
