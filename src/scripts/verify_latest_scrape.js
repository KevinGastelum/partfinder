
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLatest() {
    console.log("🔍 Verifying latest scraped items...");
    
    // Fetch last 20 items added
    const { data, error } = await supabase
        .from('listings')
        .select('id, title, brand, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("❌ Error fetching listings:", error.message);
        return;
    }

    console.log(`✅ Fetched ${data.length} recent listings.`);
    console.table(data.map(i => ({
        title: i.title.substring(0, 50) + '...',
        brand: i.brand,
        created: new Date(i.created_at).toLocaleTimeString()
    })));

    const withBrand = data.filter(i => i.brand && i.brand !== 'Unknown');
    console.log(`\n📊 Stats: ${withBrand.length}/${data.length} have a valid brand.`);
}

verifyLatest();
