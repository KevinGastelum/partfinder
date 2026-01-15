
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyInventory() {
    console.log("📊 Verifying Inventory Stats...");
    
    // Total Count
    const { count, error } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Error fetching count:", error.message);
        return;
    }
    console.log(`✅ Total Listings: ${count}`);

    // Check Brand Distribution (Sample)
    const { data: brandData, error: brandError } = await supabase
        .from('listings')
        .select('brand')
        .not('brand', 'is', null)
        .limit(1000); // Check a sample
    
    if (brandError) console.error("Error fetching brands:", brandError);
    
    const brands = {};
    brandData.forEach(i => {
        brands[i.brand] = (brands[i.brand] || 0) + 1;
    });

    console.log("\n🏷️  Brand Distribution (Sample 1000):");
    console.table(Object.entries(brands).sort((a,b) => b[1] - a[1]).slice(0, 10));
}

verifyInventory();
