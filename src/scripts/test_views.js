
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  console.log("🔍 Testing Views with ANON KEY...\n");
  
  // Test distinct_years view
  console.log("=== distinct_years ===");
  const { data: years, error: yearsError } = await supabase
    .from('distinct_years')
    .select('year')
    .order('year', { ascending: false });
    
  if (yearsError) {
    console.error("Error:", yearsError);
  } else {
    console.log(`Years: ${years.map(y => y.year).join(', ')}`);
  }
  
  // Test distinct_makes view for 2018
  console.log("\n=== distinct_makes (2018) ===");
  const { data: makes, error: makesError } = await supabase
    .from('distinct_makes')
    .select('make')
    .eq('year', 2018);
    
  if (makesError) {
    console.error("Error:", makesError);
  } else {
    console.log(`Makes for 2018: ${makes.map(m => m.make).join(', ')}`);
  }
}

test();
