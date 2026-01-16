
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
  console.log("🔍 Testing search with REAL data...\n");
  
  // First, get a sample of actual data
  console.log("=== Getting sample listings ===");
  const { data: sample } = await supabase
    .from('listings')
    .select('year, make, model, part_name, price')
    .not('year', 'is', null)
    .not('make', 'is', null)
    .limit(5);
  
  if (sample) {
    console.log("Sample data:");
    sample.forEach(s => console.log(`  ${s.year} ${s.make} ${s.model} - ${s.part_name} - $${s.price}`));
    
    // Test search with actual data from first row
    const testData = sample[0];
    console.log(`\n=== Testing search with: ${testData.year} ${testData.make} ${testData.model} ===`);
    
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('year', testData.year)
      .eq('make', testData.make)
      .eq('model', testData.model)
      .limit(10);
    
    const elapsed = Date.now() - startTime;
    
    if (error) {
      console.error("❌ Error:", error.message);
    } else {
      console.log(`✅ Query completed in ${elapsed}ms`);
      console.log(`📊 Results: ${data.length}`);
      data.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i+1}. ${item.title?.substring(0, 50)}... - $${item.price}`);
      });
    }
  }
}

test();
