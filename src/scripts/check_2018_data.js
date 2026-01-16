
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
  console.log("Checking 2018 listings...");
  
  const { data, error, count } = await supabase
    .from('listings')
    .select('year, make, model', { count: 'exact', head: false })
    .eq('year', 2018)
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Found ${count} rows for 2018.`);
    console.log("Sample:", data);
  }
  
  // Also check string '2018' just in case
  /*
  const { count: strCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('year', '2018');
  console.log(`Found ${strCount} rows for string '2018'.`);
  */
}

check();
