
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

async function check() {
  console.log("🔍 Checking vehicles table directly...\n");
  
  // 1. Total count
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });
  console.log(`Total vehicles: ${count}`);
  
  // 2. Distinct years
  const { data: yearsData, error: yearsError } = await supabase
    .from('vehicles')
    .select('year')
    .order('year', { ascending: false })
    .limit(100);
    
  if (yearsError) {
    console.error("Years query error:", yearsError);
  } else {
    const years = [...new Set(yearsData.map(d => d.year))].slice(0, 20);
    console.log(`\nDistinct years (up to 20): ${years.join(', ')}`);
  }
  
  // 3. Check for 2018 specifically
  const { data: data2018, count: count2018 } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('year', 2018)
    .limit(5);
    
  console.log(`\n2018 vehicles count: ${count2018}`);
  if (data2018 && data2018.length > 0) {
    console.log("Sample 2018 vehicles:", data2018);
  }
  
  // 4. Check RLS policies
  console.log("\n⚠️ Note: If year data exists but UI doesn't show it,");
  console.log("   check for RLS policies or client-side filtering.");
}

check();
