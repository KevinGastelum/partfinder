
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Test with ANON key (same as frontend uses)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function check() {
  console.log("🔍 Testing with ANON KEY (same as frontend)...\n");
  
  const start = Date.now();
  
  const { data, error } = await supabase
    .from('vehicles')
    .select('year')
    .order('year', { ascending: false })
    .limit(10000);
    
  const elapsed = Date.now() - start;
  
  if (error) {
    console.error("❌ Error:", error);
    return;
  }
  
  console.log(`Query took: ${elapsed}ms`);
  console.log(`Rows returned: ${data.length}`);
  
  const years = [...new Set(data.map(d => d.year))];
  console.log(`Distinct years: ${years.join(', ')}`);
}

check();
