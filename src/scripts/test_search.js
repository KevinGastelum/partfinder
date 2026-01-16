
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

async function testSearch() {
  console.log("🔍 Testing optimized search query...\n");
  
  const year = 2023;
  const make = 'FORD';
  const model = 'F-150';
  const part = 'brake';
  
  const startTime = Date.now();
  
  let query = supabase
    .from('listings')
    .select('id, title, price, make, model, year, part_name')
    .order('price', { ascending: true });
    
  // Use indexed eq for year
  query = query.eq('year', year);
  
  // Case-insensitive match for make
  query = query.ilike('make', make);
  
  // Flexible model match
  query = query.ilike('model', `%${model.replace('-', '%')}%`);
  
  // Part name text search
  if (part) {
    query = query.ilike('part_name', `%${part}%`);
  }
  
  query = query.limit(100);
  
  const { data, error } = await query;
  
  const elapsed = Date.now() - startTime;
  
  if (error) {
    console.error("❌ Error:", error);
  } else {
    console.log(`✅ Query completed in ${elapsed}ms`);
    console.log(`📊 Results: ${data.length}`);
    if (data.length > 0) {
      console.log("\n📦 Sample results:");
      data.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i+1}. ${item.year} ${item.make} ${item.model} - ${item.part_name} - $${item.price}`);
      });
    }
  }
}

testSearch();
