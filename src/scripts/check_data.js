
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

async function checkData() {
  console.log("🔍 Checking actual data in listings table...\n");
  
  // Check what years exist
  console.log("=== Years with most listings ===");
  const { data: yearData } = await supabase
    .from('listings')
    .select('year')
    .not('year', 'is', null)
    .limit(1000);
  
  const yearCounts = {};
  yearData?.forEach(r => { yearCounts[r.year] = (yearCounts[r.year] || 0) + 1; });
  console.log(Object.entries(yearCounts).sort((a,b) => b[1] - a[1]).slice(0, 10));
  
  // Check sample of makes
  console.log("\n=== Sample makes ===");
  const { data: makeData } = await supabase
    .from('listings')
    .select('make')
    .not('make', 'is', null)
    .limit(100);
  
  const makes = [...new Set(makeData?.map(r => r.make))].slice(0, 15);
  console.log(makes);
  
  // Check sample of models for a specific make
  console.log("\n=== Sample Ford models ===");
  const { data: fordData } = await supabase
    .from('listings')
    .select('model, year')
    .ilike('make', 'FORD')
    .limit(50);
  
  const fordModels = [...new Set(fordData?.map(r => `${r.year} ${r.model}`))].slice(0, 10);
  console.log(fordModels);
  
  // Check sample part names
  console.log("\n=== Sample part names ===");
  const { data: partData } = await supabase
    .from('listings')
    .select('part_name')
    .not('part_name', 'is', null)
    .limit(50);
  
  const parts = [...new Set(partData?.map(r => r.part_name))].slice(0, 10);
  console.log(parts);
}

checkData();
