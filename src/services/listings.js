
import { supabase } from './supabase';

/**
 * Search/Fetch listings from Supabase based on criteria.
 * @param {Object} criteria - { year, make, model, part }
 * @returns {Promise<Array>} - List of matching parts
 */
export const searchListings = async ({ year, make, model, part }) => {
  let query = supabase
    .from('listings')
    .select('*')
    .order('price', { ascending: true });

  if (year) {
    query = query.eq('year', year);
  }
  if (make) {
    query = query.ilike('make', make); // Case insensitive
  }
  if (model) {
    // Heuristic: Dropdowns give "Civic Base", but DB might just have "Civic"
    // Search for the first part of the model string
    const coreModel = model.split(' ')[0]; 
    query = query.ilike('model', `%${coreModel}%`); 
  }
  if (part) {
    query = query.ilike('part_name', `%${part}%`); // Partial match
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listings:', error);
    throw error;
  }

  // Map database fields to UI fields if necessary (snake_case -> camelCase is typical, 
  // but our table uses snake_case and our UI might expect camelCase or we just adapt)
  // The UI currently expects: id, title, price, serviceFee, store, condition, image, link
  
  return data.map(item => ({
    id: item.id,
    title: item.title,
    price: item.price,
    serviceFee: item.service_fee,
    store: item.store,
    condition: item.condition,
    image: item.image_url,
    link: item.link
  }));
};

/**
 * Fetch a single listing by ID.
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export const getListingById = async (id) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching listing:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    price: data.price,
    serviceFee: data.service_fee,
    store: data.store,
    condition: data.condition,
    image: data.image_url,
    link: data.link,
    // Add other fields as needed for details page
    year: data.year,
    make: data.make,
    model: data.model,
    partName: data.part_name
  };
};
