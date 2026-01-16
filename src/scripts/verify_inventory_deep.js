
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCounts() {
  console.log("📊 Verifying Database Counts...");
  
  // 1. Check Listings Count
  const { count: listingsCount, error: listError } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });
    
  if (listError) console.error("❌ Listings Count Error:", listError);
  else console.log(`✅ Total Listings: ${listingsCount.toLocaleString()}`);

  // 2. Check Vehicles Count (Dropdown source)
  const { count: vehiclesCount, error: vehError } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });

  if (vehError) console.error("❌ Vehicles Count Error:", vehError);
  else console.log(`✅ Total Vehicles (Reference): ${vehiclesCount.toLocaleString()}`);

  // 3. Check for Orphaned Years (Listings with years not in Vehicles)
  // Note: accurate query requires SQL join, roughly checking sample here
  const { data: sampleListings } = await supabase
    .from('listings')
    .select('year, make, model')
    .limit(5);
    
  console.log("🔍 Sample Listings:", sampleListings);
}

verifyCounts();
