
import { supabase } from './supabase';

/**
 * Search/Fetch listings from Supabase based on criteria.
 * @param {Object} criteria - { year, make, model, part }
 * @returns {Promise<Array>} - List of matching parts
 */
export const searchListings = async ({ year, make, model, part }) => {
  // Strategy: Fetch by year/make/model (indexed, fast), then filter by part client-side
  let query = supabase
    .from('listings')
    .select('*')
    .order('price', { ascending: true });

  // Use indexed eq() filters for exact matches (FAST - uses B-tree indexes)
  if (year) {
    query = query.eq('year', parseInt(year));
  }
  if (make) {
    query = query.eq('make', make.toUpperCase());
  }
  if (model) {
    query = query.eq('model', model);
  }
  
  // Fetch more results to allow client-side part filtering
  query = query.limit(500);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listings:', error);
    throw error;
  }

  // Client-side filtering for part name (avoids database timeout)
  let filteredData = data;
  if (part && data) {
    const partLower = part.toLowerCase();
    filteredData = data.filter(item => 
      item.part_name?.toLowerCase().includes(partLower) ||
      item.title?.toLowerCase().includes(partLower)
    );
  }

  // --- JIT SCOUT TRIGGER ---
  // If no results found in DB, try to trigger the live scout
  // Construct a search string from the criteria for the scout
  const searchString = [year, make, model, part].filter(Boolean).join(' ');
  if ((!filteredData || filteredData.length === 0) && searchString && searchString.length > 3) {
    console.log(`🕵️ JIT: No results for "${searchString}". Triggering Scout...`);
    try {
      // Call Serverless Function (works on Vercel or if proxy configured)
      // Note: In local Vite without 'vercel dev', this might 404. 
      // We use a graceful degrade.
      fetch(`/api/scout?q=${encodeURIComponent(searchString)}`)
        .then(async res => {
           const contentType = res.headers.get("content-type");
           if (contentType && contentType.includes("application/json")) {
             return res.json();
           } else {
             // Likely local dev serving static file or 404 HTML
             // throw new Error("Scout API response was not JSON");
             return { success: false, data: [] }; // Silent fallback
           }
        })
        .then(scoutData => {
           console.log("🕵️ Scout Response:", scoutData);
           if (scoutData.success && scoutData.data && scoutData.data.length > 0) {
               // Ideally, we would reload the page or trigger a re-fetch here
               // For MVP, we can just log that new data is available
               // In a full app, we might merge these results into the 'data' array before returning
               // But since 'searchListings' is async, we can't easily wait for a 3s scrape without blocking UI
               // Strategy: Return empty now, but fire a toast/notification?
               // Or, if we WANT to wait (better UX for first search):
           }
        })
        .catch(err => console.warn("Scout trigger failed (likely expected in local dev):", err));
        
    } catch (e) {
      console.warn("JIT trigger error:", e);
    }
  }

  // Map database fields to UI fields if necessary (snake_case -> camelCase is typical, 
  // but our table uses snake_case and our UI might expect camelCase or we just adapt)
  // The UI currently expects: id, title, price, serviceFee, store, condition, image, link
  
  return filteredData.map(item => ({
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
