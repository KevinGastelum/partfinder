
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, anonKey);
const serviceClient = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log("🔍 COMPARISON TEST\n");
  
  // Test 1: Count with ANON key
  console.log("=== ANON KEY ===");
  const { count: anonCount } = await anonClient
    .from('vehicles')
    .select('*', { count: 'exact', head: true });
  console.log(`Total count: ${anonCount}`);
  
  // Test 2: Count with Service key
  console.log("\n=== SERVICE KEY ===");
  const { count: serviceCount } = await serviceClient
    .from('vehicles')
    .select('*', { count: 'exact', head: true });
  console.log(`Total count: ${serviceCount}`);
  
  // Test 3: Distinct years with Service key
  const { data: yearsData } = await serviceClient
    .from('vehicles')
    .select('year')
    .order('year', { ascending: false })
    .limit(5000);
    
  const distinctYears = [...new Set(yearsData.map(d => d.year))];
  console.log(`\nDistinct years (Service): ${distinctYears.join(', ')}`);
  
  // Test 4: Check if 2018 exists
  const { count: count2018 } = await anonClient
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('year', 2018);
  console.log(`\n2018 vehicles via ANON: ${count2018}`);
}

check();
