
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables manually since we are in a module
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.existsSync(envPath) 
    ? Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(Boolean).map(line => line.split('=')))
    : {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials (URL or Service Role Key)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedData() {
    try {
        console.log('📦 Loading scraped data...');
        
        // Load combined data file from src/data/
        const dataPath = path.resolve(__dirname, '../data/final_scraped_data.json');
        const allItems = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        console.log(`Initial count: ${allItems.length}`);

        // Filter and Map to 'listings' schema
        // Data is already cleaned and mapped in final_scraped_data.json
        // Just ensure numeric fields are numbers (JSON usually handles this, but safety first)
        const validItems = allItems.map(item => ({
            ...item,
            price: Number(item.price),
            service_fee: Number(item.service_fee)
        }));


        console.log(`Valid unique items to insert: ${validItems.length}`);

        if (validItems.length === 0) {
            console.warn('⚠️ No valid items found to insert.');
            return;
        }

        // Insert in chunks
        const chunkSize = 20;
        for (let i = 0; i < validItems.length; i += chunkSize) {
            const chunk = validItems.slice(i, i + chunkSize);
            const { error } = await supabase.from('listings').insert(chunk);
            if (error) {
                console.error(`Error inserting chunk ${i}:`, error);
            } else {
                console.log(`✅ Inserted items ${i + 1} to ${Math.min(i + chunkSize, validItems.length)}`);
            }
        }

        console.log('🎉 Seeding complete!');

    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

seedData();
