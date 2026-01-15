import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkFilterCompleteness() {
  console.log('🔍 Checking filter completeness...\n');

  // Get ALL unique years from database
  const { data: yearData, error: yearError } = await supabase
    .from('listings')
    .select('year')
    .not('year', 'is', null);

  if (yearError) {
    console.error('Error fetching years:', yearError);
    return;
  }

  // Get ALL unique makes
  const { data: makeData, error: makeError } = await supabase
    .from('listings')
    .select('make')
    .not('make', 'is', null);

  if (makeError) {
    console.error('Error fetching makes:', makeError);
    return;
  }

  // Get ALL unique models
  const { data: modelData, error: modelError } = await supabase
    .from('listings')
    .select('model')
    .not('model', 'is', null);

  if (modelError) {
    console.error('Error fetching models:', modelError);
    return;
  }

  // Get ALL unique parts
  const { data: partData, error: partError } = await supabase
    .from('listings')
    .select('part_name')
    .not('part_name', 'is', null);

  if (partError) {
    console.error('Error fetching parts:', partError);
    return;
  }

  // Count occurrences
  const yearCounts = {};
  yearData?.forEach(r => { yearCounts[r.year] = (yearCounts[r.year] || 0) + 1; });

  const makeCounts = {};
  makeData?.forEach(r => { makeCounts[r.make] = (makeCounts[r.make] || 0) + 1; });

  const modelCounts = {};
  modelData?.forEach(r => { modelCounts[r.model] = (modelCounts[r.model] || 0) + 1; });

  const partCounts = {};
  partData?.forEach(r => { partCounts[r.part_name] = (partCounts[r.part_name] || 0) + 1; });

  // Display results
  console.log('📅 YEARS:');
  const sortedYears = Object.entries(yearCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  sortedYears.forEach(([year, count]) => {
    console.log(`  ${year}: ${count} listings`);
  });
  console.log(`  Total unique years: ${sortedYears.length}\n`);

  console.log('🚗 MAKES:');
  const sortedMakes = Object.entries(makeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20
  sortedMakes.forEach(([make, count]) => {
    console.log(`  ${make}: ${count} listings`);
  });
  console.log(`  Total unique makes: ${Object.keys(makeCounts).length}\n`);

  console.log('🔧 MODELS:');
  const sortedModels = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20
  sortedModels.forEach(([model, count]) => {
    console.log(`  ${model}: ${count} listings`);
  });
  console.log(`  Total unique models: ${Object.keys(modelCounts).length}\n`);

  console.log('⚙️ PARTS:');
  const sortedParts = Object.entries(partCounts)
    .sort((a, b) => b[1] - a[1]);
  sortedParts.forEach(([part, count]) => {
    console.log(`  ${part}: ${count} listings`);
  });
  console.log(`  Total unique parts: ${sortedParts.length}\n`);

  // Check for gaps in years
  console.log('🔍 Checking for year gaps...');
  const years = sortedYears.map(([year]) => Number(year));
  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const missingYears = [];
    
    for (let y = minYear; y <= maxYear; y++) {
      if (!years.includes(y)) {
        missingYears.push(y);
      }
    }
    
    if (missingYears.length > 0) {
      console.log(`  ⚠️ Missing years in range ${minYear}-${maxYear}:`, missingYears.join(', '));
    } else {
      console.log(`  ✅ No gaps found between ${minYear} and ${maxYear}`);
    }
  }
}

checkFilterCompleteness()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
