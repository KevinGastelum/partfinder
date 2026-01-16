
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

async function seed() {
  console.log("🌱 Seeding 2018 Ford F-150...");
  
  const { error } = await supabase
    .from('vehicles')
    .insert([
      { year: 2018, make: 'FORD', model: 'F-150' },
      { year: 2018, make: 'FORD', model: 'Mustang' },
      { year: 2018, make: 'TOYOTA', model: 'Camry' }
    ]);
    
  if (error) {
    if (error.code === '23505') { // Unique violation
        console.log("✅ 2018 vehicles already exist (or partial).");
    } else {
        console.error("❌ Error seeding:", error);
    }
  } else {
    console.log("✅ Successfully seeded 2018 sample vehicles!");
  }
}

seed();
