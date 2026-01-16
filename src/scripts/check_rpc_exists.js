
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

async function checkRpc() {
  console.log("Checking for 'get_years' function...");
  // Try to call it directly server-side (no CORS here)
  const { data, error } = await supabase.rpc('get_years');
  
  if (error) {
    console.error("RPC Call Failed:", error);
    // Also query pg_proc to be sure
    const { data: procData, error: procError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'get_years');
        
    if (procError) console.error("Could not query pg_proc:", procError);
    else console.log("pg_proc match:", procData);
    
  } else {
    console.log("✅ RPC 'get_years' works! Result sample:", data ? data.slice(0, 5) : 'No data');
  }
}

checkRpc();
