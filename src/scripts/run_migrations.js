
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename, sql) {
  console.log(`\n📦 Running: ${filename}...`);
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    // RPC might not exist, try direct query workaround
    console.log(`⚠️ RPC failed, this is expected. Migration SQL needs to be run in Supabase Dashboard.`);
    console.log(`\n--- Copy this SQL to Supabase SQL Editor ---`);
    console.log(sql);
    console.log(`--- End of SQL ---\n`);
    return false;
  }
  
  console.log(`✅ ${filename} completed.`);
  return true;
}

async function main() {
  console.log("🚀 Starting Database Optimization...");
  
  // Read migration files
  const migrationsDir = join(__dirname, '../db/migrations');
  
  const indexesSql = fs.readFileSync(join(migrationsDir, '001_add_indexes.sql'), 'utf8');
  const populateSql = fs.readFileSync(join(migrationsDir, '002_populate_vehicles.sql'), 'utf8');
  
  console.log("\n📝 Migration SQL prepared. Since direct SQL execution may timeout,");
  console.log("   please run these in the Supabase Dashboard SQL Editor:\n");
  
  console.log("=== STEP 1: Add Indexes ===");
  console.log(indexesSql);
  
  console.log("\n=== STEP 2: Populate Vehicles ===");
  console.log(populateSql);
  
  console.log("\n✅ After running both in the Dashboard, verify with:");
  console.log("   SELECT COUNT(*) FROM vehicles;");
  console.log("   SELECT DISTINCT year FROM vehicles ORDER BY year DESC;");
}

main();
