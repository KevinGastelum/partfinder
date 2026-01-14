
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const getYears = async () => {
  const { data, error } = await supabase.rpc('get_years');
  if (error) throw error;
  return data.map(d => d.year);
};

export const getMakes = async (year) => {
  const { data, error } = await supabase.rpc('get_makes', { selected_year: year });
  if (error) throw error;
  return data.map(d => d.make);
};

export const getModels = async (year, make) => {
  const { data, error } = await supabase.rpc('get_models', { 
    selected_year: year, 
    selected_make: make 
  });
  if (error) throw error;
  return data.map(d => d.model);
};
