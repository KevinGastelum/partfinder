import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function quickCheck() {
  // Get unique years with counts using RPC or aggregation
  const { data, error } = await supabase
    .from('listings')
    .select('year')
    .not('year', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const yearCounts = {};
  data.forEach(r => {
    yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
  });

  console.log('\n📅 All Years in Database:');
  Object.entries(yearCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([year, count]) => {
      console.log(`  ${year}: ${count.toLocaleString()} listings`);
    });

  console.log(`\nTotal rows fetched: ${data.length.toLocaleString()}`);
  console.log(`Unique years: ${Object.keys(yearCounts).length}`);
}

quickCheck()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
