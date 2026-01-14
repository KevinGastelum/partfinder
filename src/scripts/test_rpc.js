
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.existsSync(envPath) 
    ? Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(Boolean).map(line => line.split('=')))
    : {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRpc() {
    console.log('Testing RPC `get_years`...');
    const { data, error } = await supabase.rpc('get_years');
    
    if (error) {
        console.error('❌ RPC Failed:', error.message);
    } else {
        console.log('✅ RPC Success! Years returned:', data);
    }
}

testRpc();
