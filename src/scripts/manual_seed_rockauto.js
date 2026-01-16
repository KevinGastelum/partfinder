
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("🌱 Manually seeding RockAuto listing...");
  const item = {
    title: 'ACDELCO 17D1367CH Professional Ceramic Front Disc Brake Pads',
    price: 34.79,
    link: 'https://www.rockauto.com/en/moreinfo.php?pk=5755086&cc=3307073&pt=1684&jsn=8', // Real link
    image_url: 'https://www.rockauto.com/info/357/17D1367CH_Primary.jpg',
    // source: 'RockAuto', // Column missing in DB, skipping for test
    brand: 'ACDELCO',
    make: 'Ford',
    model: 'F-150',
    year: 2018,
    part_name: 'Brake Pads'
  };

  const { data, error } = await supabase.from('listings').insert(item).select();
  if (error) console.error("Error:", error);
  else console.log("✅ Inserted:", data[0].title);
}

seed();
