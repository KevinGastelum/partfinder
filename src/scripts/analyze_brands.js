
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyBrands() {
  console.log('Verifying backfill results...');
  
  // 1. Check if we can select 'brand'
  const { data: sample, error: sampleError } = await supabase
    .from('listings')
    .select('id, brand')
    .limit(1);
    
  if (sampleError) {
      console.error('CRITICAL: Could not select brand column. Migration might have failed.', sampleError);
      return;
  }
  console.log('Column check passed. Sample row:', sample);

  // 2. Count unknowns
  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .or('brand.is.null,brand.eq.Unknown');

  if (error) {
    console.error('Count Error:', error);
  } else {
    console.log(`Remaining listings with Unknown/Null brand: ${count}`);
  }
}

verifyBrands();
