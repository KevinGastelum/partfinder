
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Common auto parts brands to check for
const KNOWN_BRANDS = [
  'Duralast', 'Duralast Gold', 'Duralast Platinum', 'Duralast Elite',
  'Bosch', 'NGK', 'Denso', 'Motorcraft', 'ACDelco', 
  'Valucraft', 'STP', 'Mobil 1', 'K&N', 'Fram',
  'Moog', 'Brembo', 'Wagner', 'TRW', 'Mopar',
  'MagnaFlow', 'Flowmaster', 'Borla',
  'Sylvania', 'Philips', 'Odyssey', 'Optima'
];

async function backfillBrands() {
  console.log('Starting brand backfill...');
  
  // 1. Fetch listings with missing brands
  // Fetch in chunks to avoid memory issues
  const PAGE_SIZE = 500;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching next batch of unresolved listings...`);
    
    // FETCH STRATEGY: 
    // Since we are filtering by "brand is null/Unknown" and then UPDATE them,
    // the updated rows will leave this result set.
    // Therefore, we should ALWAYS fetch the first page (range 0 to PAGE_SIZE).
    // If we incremented 'page', we would skip records.
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, brand')
      .or('brand.is.null,brand.eq.Unknown')
      .range(0, PAGE_SIZE - 1); // Always fetch the top of the queue

    if (error) {
      console.error('Error fetching listings:', error);
      break;
    }

    if (!listings || listings.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing ${listings.length} listings...`);
    
    // Prepare updates
    const updates = [];
    
    for (const item of listings) {
      let detectedBrand = 'Unknown';
      const titleUpper = item.title.toUpperCase();

      // Check against known brands list (Case insensitive search)
      for (const brand of KNOWN_BRANDS) {
        if (titleUpper.includes(brand.toUpperCase())) {
          detectedBrand = brand;
          break; // Take the first match
        }
      }

      // If not found in known list, try heuristic: First word if it looks like a brand?
      // Only if we are fairly sure. For now, let's stick to known list + maybe first word if valid.
      if (detectedBrand === 'Unknown') {
         // Fallback: If title starts with a capitalized word that isn't a year/make/part generic
         const firstWord = item.title.split(' ')[0];
         // Simple check: longer than 2 chars, not a number
         if (firstWord.length > 2 && isNaN(firstWord)) {
             // Maybe log this for review, or blindly accept?
             // Let's be conservative for now.
         }
      }

      if (detectedBrand !== 'Unknown' && detectedBrand !== item.brand) {
         updates.push({
             id: item.id,
             brand: detectedBrand
         });
      }
    }

    // Perform bulk updates? Supabase JS doesn't support bulk update easily with different values.
    // We have to loop. To be faster, we can Promise.all in batches.
    if (updates.length > 0) {
        console.log(`Updating ${updates.length} listings in this batch...`);
        
        // Split into chunks of 20 for parallel requests
        const CHUNK_SIZE = 20;
        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
            const chunk = updates.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(update => 
                supabase.from('listings').update({ brand: update.brand }).eq('id', update.id)
            ));
            process.stdout.write('.');
        }
        console.log('\nBatch complete.');
        totalUpdated += updates.length;
    } else {
        console.log('No updates needed in this batch.');
    }

    // Next page
    // Since we are always fetching range(0, size) of the filtered set, we DON'T increment page.
    // The previous batch has been "removed" from the set by the update.
    // However, if we failed to update any in the batch (e.g. all were truly Unknown),
    // we would get stuck in an infinite loop fetching the same unfixable records.
    
    if (updates.length < 5 && listings.length > 0) {
        // Safety Break: If we found data but couldn't update many, we might be stuck.
        // In reality, we should probably add a flag 'processed' or just stop.
        // For now, let's assume we can fix most. If we can't, break to avoid loop.
        console.log('Few updates possible in this batch. Stopping to prevent infinite loop.');
        hasMore = false;
    }

    if (updates.length === 0 && listings.length > 0) {
        // Verified stuck
         console.log('No updates made on this batch of Unknowns. Stopping.');
         hasMore = false;
    }
  }

  console.log(`Backfill complete. Total listings updated: ${totalUpdated}`);
}

backfillBrands()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
