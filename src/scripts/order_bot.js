
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

puppeteer.use(StealthPlugin());

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// MUST use Service Role Key to update order status securely
// Using Anon key here for now if Service Role is not in .env, but strictly should be Service Role.
// Assuming the user has a way to run this securely.
// For verify, we'll try to use the ENV variable if it exists, otherwise warn.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function processOrder(order) {
  console.log(`[Order ${order.id}] Processing...`);
  
  // 1. Fetch Listing Details
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', order.listing_id)
    .single();

  if (listingError || !listing) {
    console.error(`[Order ${order.id}] Listing not found:`, listingError);
    return;
  }

  console.log(`[Order ${order.id}] Purchasing: ${listing.title}`);
  console.log(`[Order ${order.id}] Link: ${listing.link}`);

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for demo
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 3. Navigate to Listing
    await page.goto(listing.link, { waitUntil: 'domcontentloaded' });
    
    // START REFINEMENT: Stock Check
    const outOfStockSelectors = [
        '.d-quantity__availability .clipped', // "0 available" hidden text
        '#isCartBtn_btn[disabled]',          // Disabled cart button
        '.d-quantity__availability--outofstock' 
    ];

    // Check for explicit "Out of Stock" text
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("0 available") || pageText.includes("Out of stock")) {
        console.warn(`[Order ${order.id}] Item appears out of stock.`);
        throw new Error("Item Out of Stock");
    }
    // END REFINEMENT

    // 4. Click "Buy It Now" or "Add to Cart"
    // Heuristic: Look for common eBay buttons
    const buyButtonSelectors = [
      'a[id^="binBtn_btn"]', // Robust: Matches binBtn_btn, binBtn_btn_1, etc.
      'a[data-testid="binBtn_btn"]',
      '#binBtn_btn',
      '.x-bin-action a' // Fallback class based selector
    ];
    
    let clicked = false;
    for (const selector of buyButtonSelectors) {
      if (await page.$(selector)) {
        console.log(`[Order ${order.id}] Found Buy Button: ${selector}`);
        
        // Revised Navigation Logic: Click and wait for key elements instead of generic network idle
        await page.click(selector);
        console.log(`[Order ${order.id}] Clicked. Waiting for navigation...`);
        
        try {
            // Wait for either a Sign In field, Guest Checkout, or a Checkout container
            await page.waitForSelector('#userid, #gxo-btn, .guest-checkout, .cart-summary, #mainContent, input[name="username"]', {
                timeout: 10000 
            });
        } catch (e) {
            console.log(`[Order ${order.id}] Warning: Navigation timeout or selector not found. Proceeding to screenshot check.`);
        }
        
        clicked = true;
        break;
      }
    }

    if (!clicked) {
        console.log(`[Order ${order.id}] Could not find standard BN button. Taking screenshot.`);
        await page.screenshot({ path: `order_${order.id}_failed_btn.png` });
        throw new Error("Buy button not found");
    }

    // 5. Handle "Guest Checkout" if prompted
    console.log(`[Order ${order.id}] Navigated to next screen. Current URL: ${page.url()}`);
    
    // DRY RUN STOP
    // We will just take a screenshot here to prove we got to the next step.
    const screenshotPath = `order_${order.id}_checkout_step1.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`[Order ${order.id}] Screenshot saved: ${screenshotPath}`);

    // 6. Update Order Status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'fulfilling', stripe_payment_id: order.stripe_payment_id + '_bot_checked' }) // Mark as processed
      .eq('id', order.id);

    if (updateError) console.error("Error updating order:", updateError);

  } catch (err) {
    console.error(`[Order ${order.id}] Bot Error:`, err);
    
    // START REFINEMENT: Update Status on Failure
    await supabase.from('orders')
        .update({ status: 'failed', stripe_payment_id: `FAILED: ${err.message}` })
        .eq('id', order.id);
    // END REFINEMENT

  } finally {
    await browser.close();
  }
}

async function startBot() {
  console.log("🤖 Auto-Buyer Bot Started...");
  console.log("Listening for orders with status: 'paid'");

  // Initial Check
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid');

  if (orders && orders.length > 0) {
    console.log(`Found ${orders.length} pending orders.`);
    for (const order of orders) {
      await processOrder(order);
    }
  } else {
      console.log("No pending orders found.");
  }

  // Realtime Subscription
  supabase
    .channel('orders_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      console.log('New Order received!', payload.new);
      if (payload.new.status === 'paid') {
        processOrder(payload.new);
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
       if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
           console.log('Order status updated to PAID. Processing...');
           processOrder(payload.new);
       }
    })
    .subscribe();
}

startBot();
