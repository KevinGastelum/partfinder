
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

async function testOptimizedSearch() {
  console.log("🔍 Testing OPTIMIZED search with .eq() filters...\n");
  
  const year = 2023;
  const make = 'FORD';
  const model = 'F-150';
  const part = 'brake';
  
  const startTime = Date.now();
  
  let query = supabase
    .from('listings')
    .select('id, title, price, make, model, year, part_name')
    .order('price', { ascending: true });
    
  // Use indexed eq() for year, make, model (FAST)
  query = query.eq('year', year);
  query = query.eq('make', make);
  query = query.eq('model', model);
  
  // Only ilike for part_name
  if (part) {
    query = query.ilike('part_name', `%${part}%`);
  }
  
  query = query.limit(100);
  
  const { data, error } = await query;
  
  const elapsed = Date.now() - startTime;
  
  if (error) {
    console.error("❌ Error:", error.message);
    console.log("\nTrying without part filter...");
    
    // Retry without part filter
    const { data: data2, error: error2 } = await supabase
      .from('listings')
      .select('id, title, price, make, model, year, part_name')
      .eq('year', year)
      .eq('make', make)
      .eq('model', model)
      .order('price', { ascending: true })
      .limit(10);
      
    const elapsed2 = Date.now() - startTime;
    
    if (error2) {
      console.error("❌ Still failed:", error2.message);
    } else {
      console.log(`✅ Without part filter: ${elapsed2}ms`);
      console.log(`📊 Results: ${data2.length}`);
      if (data2.length > 0) {
        console.log("\n📦 Sample results:");
        data2.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i+1}. ${item.year} ${item.make} ${item.model} - ${item.part_name} - $${item.price}`);
        });
      }
    }
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

testOptimizedSearch();
