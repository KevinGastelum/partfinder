
import { supabase } from './supabase';

// Hardcoded fallback years (reliable if DB query fails)
const FALLBACK_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008];

export const getYears = async () => {
  try {
    // Query vehicles table directly
    const { data, error } = await supabase
      .from('vehicles')
      .select('year')
      .order('year', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn('getYears error, using fallback:', error.message);
      return FALLBACK_YEARS;
    }
    
    // Dedupe and return
    const years = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);
    return years.length > 0 ? years : FALLBACK_YEARS;
  } catch (err) {
    console.warn('getYears exception, using fallback:', err);
    return FALLBACK_YEARS;
  }
};

export const getMakes = async (year) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('make')
      .eq('year', parseInt(year))
      .order('make', { ascending: true })
      .limit(500);

    if (error) {
      console.warn('getMakes error:', error.message);
      return [];
    }
    
    return [...new Set(data.map(d => d.make))];
  } catch (err) {
    console.warn('getMakes exception:', err);
    return [];
  }
};

export const getModels = async (year, make) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('model')
      .eq('year', parseInt(year))
      .eq('make', make)
      .order('model', { ascending: true })
      .limit(500);

    if (error) {
      console.warn('getModels error:', error.message);
      return [];
    }
    
    return [...new Set(data.map(d => d.model))];
  } catch (err) {
    console.warn('getModels exception:', err);
    return [];
  }
};

