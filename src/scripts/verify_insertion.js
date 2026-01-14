
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.existsSync(envPath) 
    ? Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(Boolean).map(line => line.split('=')))
    : {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

// simulate frontend client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
    console.log('🔍 Verifying data access with Anon Key...');
    
    const { data, error, count } = await supabase
        .from('listings')
        .select('*', { count: 'exact' })
        .limit(5);

    if (error) {
        console.error('❌ Error accessing data:', error);
    } else {
        console.log(`✅ Success! Accessible count: ${count}`);
        console.log('Sample Data:');
        console.log(JSON.stringify(data, null, 2));
    }
}

verify();
