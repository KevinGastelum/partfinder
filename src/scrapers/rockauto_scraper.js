const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

puppeteer.use(StealthPlugin());

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeRockAuto(query) {
    let browser;
    try {
        console.log(`\n🔍 [RockAuto] Starting scrape for: "${query}"`);

        browser = await puppeteer.launch({
            headless: true, // Run headless for speed
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        
        // Optimizations
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Search URL
        const searchUrl = `https://www.rockauto.com/en/partsearch/?keywords=${encodeURIComponent(query)}`;
        console.log(`   🔗 Navigating to: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for results. RockAuto can be slow or show a tree.
        // Heuristic: Check for .listing-inner (results) OR .npart-tree-link (categories)
        try {
            await page.waitForSelector('.listing-inner, .npart-tree-link', { timeout: 15000 });
        } catch (e) {
            console.log("   ⚠️ Timeout waiting for listings or tree. Retrying...");
        }

        // Logic: 
        // 1. If .listing-inner exists, we have parts.
        // 2. If no listings but .npart-tree-link exists, we might need to drill down.
        // For now, we assume precise queries might land on a page with listings or we parse what's visible.
        // RockAuto Search often lists parts directly if query is specific "2012 F-150 Alternator"

        const listings = await page.evaluate(() => {
            const items = [];
            const rows = document.querySelectorAll('.listing-inner');
            
            rows.forEach(row => {
                // Selectors derived from research
                const brandEl = row.querySelector('.listing-final-manufacturer');
                const partNumEl = row.querySelector('.listing-final-partnumber');
                const priceEl = row.querySelector('.listing-price');
                const titleEl = row.querySelector('.listing-text-bold') || row.querySelector('.span-link-underline');
                const imgEl = row.querySelector('.listing-inline-image-thumb');

                if (brandEl && priceEl) {
                    const brand = brandEl.innerText.trim();
                    const partNumber = partNumEl ? partNumEl.innerText.trim() : 'N/A';
                    const title = titleEl ? titleEl.innerText.trim() : `${brand} Part`;
                    const priceText = priceEl.innerText.trim();
                    const price = parseFloat(priceText.replace('$', ''));
                    
                    // Construct Image URL (RockAuto often uses relative or hidden logic, img.src is usually a thumbnail)
                    let imageUrl = imgEl ? imgEl.src : null;
                    if (imageUrl && imageUrl.startsWith('/')) {
                        imageUrl = 'https://www.rockauto.com' + imageUrl;
                    }

                    items.push({
                        title: `${brand} ${title} ${partNumber}`,
                        price: price,
                        condition: 'New', // RockAuto primarily sells New
                        brand: brand,
                        image_url: imageUrl,
                        source: 'RockAuto',
                        external_id: partNumber
                    });
                }
            });
            return items;
        });

        console.log(`   📦 Found ${listings.length} listings on RockAuto.`);

        if (listings.length > 0) {
            // Deduplicate and Insert
             const { data, error } = await supabase
                .from('listings')
                .upsert(listings.map(item => ({
                    title: item.title,
                    price: item.price,
                    link: searchUrl, // Link to search results for now
                    image_url: item.image_url,
                    source: 'RockAuto',
                    brand: item.brand,
                    type: 'Part', // Generic
                    query_text: query
                })), { onConflict: 'title' }); // Simple dedup on title/brand?

            if (error) {
                console.error('   ❌ Supabase Insert Error:', error);
            } else {
                console.log(`   ✅ Saved ${listings.length} items to DB.`);
            }
        } else {
             console.log('   ⚠️ No items found. Check selector validity or search precision.');
        }

    } catch (err) {
        console.error('   ❌ Scraper Error:', err);
    } finally {
        if (browser) await browser.close();
    }
}

// Allow CLI run
if (require.main === module) {
    const query = process.argv[2] || "2012 Ford F-150 Alternator";
    scrapeRockAuto(query);
}

module.exports = { scrapeRockAuto };
