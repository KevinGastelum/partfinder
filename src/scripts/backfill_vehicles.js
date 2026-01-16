
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;

async function backfillVehicles() {
  console.log("🚀 Starting Targeted Backfill (2000-2025)...");

  // Fetch reference set to avoid duplicates
  const { data: existingVehicles } = await supabase.from('vehicles').select('year, make, model');
  const existingSet = new Set(
    (existingVehicles || []).map(v => `${v.year}|${v.make.trim()}|${v.model.trim()}`)
  );
  console.log(`📚 Loaded ${existingSet.size} existing vehicles.`);

  let totalAdded = 0;

  // Loop through target years
  for (let year = 2025; year >= 2000; year--) {
    // console.log(`\n📅 Checking Year: ${year}...`);
    
    // Fetch listings for this specific year
    // We limit to 2000 to capture enough variety of makes/models
    const { data: listings, error } = await supabase
      .from('listings')
      .select('year, make, model')
      .eq('year', year)
      .limit(2000);
      
    if (error) {
      console.error(`Error fetching ${year}:`, error.message);
      continue;
    }
    
    if (!listings || listings.length === 0) {
      // console.log(`No listings found for ${year}.`);
      continue;
    }

    // Identify New Vehicles
    const newVehicles = new Map();
    for (const item of listings) {
      if (!item.make || !item.model) continue;
      const key = `${year}|${item.make.trim()}|${item.model.trim()}`;
      
      if (!existingSet.has(key) && !newVehicles.has(key)) {
        newVehicles.set(key, { year, make: item.make.trim(), model: item.model.trim() });
      }
    }

    if (newVehicles.size > 0) {
      const payload = Array.from(newVehicles.values());
      const { error: insertError } = await supabase.from('vehicles').insert(payload);
      
      if (insertError) {
        console.error(`❌ Failed to insert ${year}:`, insertError.message);
      } else {
        // console.log(`✅ Added ${payload.length} new vehicles for ${year}.`);
        totalAdded += payload.length;
        
        // Update local set so we don't try to add again if loops overlap (unlikely here)
        payload.forEach(v => existingSet.add(`${v.year}|${v.make}|${v.model}`));
      }
    } else {
        // console.log(`No new vehicles for ${year}.`);
    }
    process.stdout.write(`\rProgress: Checked ${year}. Total Added: ${totalAdded}`);
  }

  console.log(`\n\n🎉 Backfill Complete! Added ${totalAdded} total vehicles.`);
}

backfillVehicles();
