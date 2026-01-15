
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- DIAGNOSTIC START ---');
console.log(`Target URL: ${supabaseUrl}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runDiagnostics() {
  try {
    // Test 1: List all tables in public schema
    console.log('\n[1] Checking Schema/Tables...');
    // We can query the information_schema to see what tables exist
    // Note: Service role key is required for this usually, or direct SQL access.
    // Using supabase-js, we usually just try to select from a known table or rpc.
    // Let's try to query 'listings' directly first, but limit 1.
    
    const { data: tables, error: schemaError } = await supabase
      .from('listings')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Error accessing "listings" table:', schemaError.message);
      console.error('   Details:', schemaError);
    } else {
      console.log('✅ Successfully accessed "listings" table.');
    }

    // Test 2: Count listings with Service Role (Bypass RLS)
    console.log('\n[2] Counting rows in "listings" (Bypassing RLS)...');
    const { count, error: countError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting rows:', countError.message);
    } else {
      console.log(`✅ Total Rows in "listings": ${count}`);
    }

    // Test 3: Check distinct Makes (to verify actual data content)
    if (count > 0) {
        console.log('\n[3] Sampling Data (Makes)...');
        const { data: samples, error: sampleError } = await supabase
            .from('listings')
            .select('make')
            .limit(5);
        if (sampleError) console.error('Error sampling:', sampleError);
        else console.log('   Sample Makes:', samples.map(s => s.make));
    }

  } catch (err) {
    console.error('❌ UNEXPECTED ERROR:', err);
  }
  console.log('--- DIAGNOSTIC END ---');
}

runDiagnostics();
