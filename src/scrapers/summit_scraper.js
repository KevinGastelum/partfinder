
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function scrapeSummit(searchQuery) {
  console.log(`🏔️ Scraping Summit Racing for: "${searchQuery}"`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Block resources for speed
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    const url = `https://www.summitracing.com/search?SortBy=BestKeywordMatch&SortOrder=Ascending&keyword=${encodeURIComponent(searchQuery)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Summit listings container
    // Heuristic: Wait for product blocks
    try {
        await page.waitForSelector('.product-block', { timeout: 10000 });
    } catch (e) {
        console.log("⚠️ No results or layout changed at Summit.");
        await browser.close();
        return [];
    }

    const products = await page.evaluate((query) => {
      const items = [];
      document.querySelectorAll('.product-block').forEach(el => {
        const titleEl = el.querySelector('.item-title-description a');
        const priceEl = el.querySelector('.price');
        const imgEl = el.querySelector('img.product-image'); // Often lazy loaded
        
        if (titleEl && priceEl) {
            const title = titleEl.innerText.trim();
            const link = titleEl.href;
            const priceText = priceEl.innerText.replace('$', '').replace(',', '').trim();
            const price = parseFloat(priceText);
            const image = imgEl ? imgEl.src : '';

            // Brand heuristic
            let brand = 'Summit Racing';
            const brandEl = el.querySelector('.item-brand');
            if (brandEl) brand = brandEl.innerText.trim();

            if (title && !isNaN(price)) {
                items.push({
                    title,
                    price,
                    link,
                    image,
                    source: 'Summit Racing',
                    brand,
                    part_name: query, // simplified
                    make: 'Universal', // Summit is often universal or hard to parse make from list
                    model: 'Universal',
                    year: 0
                });
            }
        }
      });
      return items;
    }, searchQuery);

    console.log(`✅ Found ${products.length} items on Summit.`);

    if (products.length > 0) {
        const { error } = await supabase.from('listings').upsert(products, { onConflict: 'link', ignoreDuplicates: true });
        if (error) console.error("Database Error:", error);
        else console.log(`💾 Saved ${products.length} items to Supabase.`);
    }
    
    return products;

  } catch (err) {
    console.error("❌ Summit Scraper Error:", err);
    return [];
  } finally {
    await browser.close();
  }
}

// Allow CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const query = process.argv[2];
    if (query) scrapeSummit(query);
    else console.log("Please provide a query: node src/scrapers/summit_scraper.js 'Camry Intake'");
}
