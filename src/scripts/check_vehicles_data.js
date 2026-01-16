
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

async function checkYears() {
  console.log("Checking `vehicles` table years...");
  const { data, error } = await supabase
    .from('vehicles')
    .select('year');

  if (error) {
    console.error("Error:", error);
    return;
  }

  const years = [...new Set(data.map(d => d.year))].sort((a,b) => b-a);
  console.log(`Found ${years.length} unique years:`, years);
  console.log(`Total rows: ${data.length}`);
}

checkYears();
