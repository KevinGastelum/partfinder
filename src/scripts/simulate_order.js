
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateOrder() {
  console.log("🚀 Starting Order Simulation...");

  // 1. Find a target listing (Prefer RockAuto)
  let { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .ilike('link', '%rockauto%')
    .limit(1);

  let listing;
  if (listings && listings.length > 0) {
    listing = listings[0];
    console.log(`✅ Found RockAuto listing: ${listing.title}`);
  } else {
    console.log("⚠️ No RockAuto listings found, falling back to any listing...");
    const { data: anyListings } = await supabase
      .from('listings')
      .select('*')
      .limit(1);
    
    if (!anyListings || anyListings.length === 0) {
      console.error("❌ No listings found in DB to purchase.");
      return;
    }
    listing = anyListings[0];
    console.log(`✅ Found Fallback listing: ${listing.title} (${listing.link})`);
  }

  // 2. Create a fake "Paid" order
  const fakeOrder = {
    user_email: 'simulation_test@example.com',
    listing_id: listing.id,
    status: 'paid',
    stripe_payment_id: `sim_${Date.now()}`,
    shipping_address: {
      name: 'Simulated User',
      address: '123 Test Lane',
      city: 'Test City',
      state: 'TS',
      zip: '12345'
    },
    item_price: listing.price,
    service_fee: listing.price * 0.3,
    shipping_cost: 15.00,
    total_amount: listing.price * 1.3 + 15.00
  };

  const { data, error: orderError } = await supabase
    .from('orders')
    .insert([fakeOrder])
    .select();

  if (orderError) {
    console.error("❌ Failed to create order:", orderError);
  } else {
    console.log(`🎉 Order Created! ID: ${data[0].id}`);
    console.log(`👉 Run 'node src/scripts/order_bot.js' now (if not running) to see it handled.`);
  }
}

simulateOrder();
