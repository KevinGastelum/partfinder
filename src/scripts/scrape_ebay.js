
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SEARCH = "2018 Honda Civic Brake Pads";
const TARGET_COUNT = 100;
const SERVICE_FEE_PERCENT = 0.30;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeEbay(query) {
    console.log(`🚀 Starting Puppeteer scrape for: "${query}"`);
    const encodedQuery = encodeURIComponent(query);
    let allListings = [];
    
    // Launch browser with stealth settings
    const browser = await puppeteer.launch({
        headless: false, // Changed to false to bypass bot detection
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1366,768',
            '--disable-infobars',
            '--excludeSwitches=enable-automation',
            '--use-gl=swiftshader' // render on CPU to avoid GPU fingerprinting issues
        ]
    });

    const page = await browser.newPage();
    
    // Mask webdriver explicitly
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    // Inject Cookies if available (Bypass CAPTCHA)
    const cookiesPath = path.join(__dirname, '../data/ebay_cookies.json');
    if (fs.existsSync(cookiesPath)) {
        console.log("   🍪 Loading saved session cookies...");
        const cookiesString = fs.readFileSync(cookiesPath);
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
    }

    // Set a realistic User Agent (Matched to Browser Subagent)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    
    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    let pageNum = 1;

    try {
        while (allListings.length < TARGET_COUNT && pageNum <= 5) {
            const url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_pgn=${pageNum}`;
            console.log(`   Mining Page ${pageNum}... (${url})`);
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait for items to likely be there
            try {
                // eBay changed from .s-item to .s-card (as of Jan 2026)
                await page.waitForSelector('.s-card', { timeout: 30000 });
            } catch (e) {
                console.log("   ⚠️  Timed out waiting for .s-card. Checking for bot detection...");
                const content = await page.content();
                fs.writeFileSync(path.join(__dirname, '../../debug_last_page.html'), content); // Save HTML for inspection
                console.log("   💾 Saved page content to: debug_last_page.html");

                if (content.includes('security check') || content.includes('captcha')) {
                    console.error("   ❌ Hit eBay CAPTCHA/Bot protection.");
                } else {
                    console.log("   ❌ Unknown page state. Check the debug HTML file.");
                }
                await page.screenshot({ path: path.join(__dirname, '../../debug_scrape_fail.png') });
                break;
            }

            // Scroll down to trigger lazy loading
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            await sleep(1000);

            // Extract items in browser context (Updated for .s-card structure)
            const items = await page.evaluate(() => {
                const results = [];
                const itemEls = document.querySelectorAll('.s-card');
                
                itemEls.forEach(el => {
                    const titleEl = el.querySelector('.s-card__title span') || el.querySelector('.s-card__title');
                    const linkEl = el.querySelector('a.s-card__link') || el.querySelector('a');
                    const imageEl = el.querySelector('img');
                    
                    const title = titleEl ? titleEl.innerText.trim() : null;
                    if (!title || title.toLowerCase() === 'shop on ebay') return;

                    // Extract price from text content
                    const cardText = el.innerText || '';
                    const priceMatch = cardText.match(/\$[\d,]+\.?\d*/);
                    const priceText = priceMatch ? priceMatch[0] : null;
                    const price = priceText ? parseFloat(priceText.replace(/[$,]/g, '')) : null;

                    if (!price) return;

                    // Try to find seller info
                    const sellerMatch = cardText.match(/\([\d,]+\)/);
                    const store = sellerMatch ? 'eBay Seller' : 'eBay Seller';
                    
                    // Condition detection
                    const condition = cardText.toLowerCase().includes('new') ? 'New' : 'Used';

                    results.push({
                        title,
                        price,
                        link: linkEl ? linkEl.href : null,
                        image_url: imageEl ? imageEl.src : null,
                        store,
                        condition
                    });
                });
                return results;
            });

            console.log(`   🔎 Found ${items.length} items on page ${pageNum}.`);
            
            if (items.length === 0) {
                console.log("   ⚠️  No items found. Stopping.");
                break;
            }

            // Process items
             const searchParts = query.split(' ');
             const year = searchParts[0] || 'Unknown';
             const make = searchParts[1] || 'Unknown';
             const model = searchParts[2] || 'Unknown';
             const part_name = searchParts.slice(3).join(' ') || 'Car Part';

            const processedItems = items.map(item => ({
                ...item,
                service_fee: (item.price * SERVICE_FEE_PERCENT).toFixed(2),
                store: "eBay - " + item.store,
                year,
                make,
                model,
                part_name
            }));

            allListings.push(...processedItems);
            console.log(`   ✅ Total items collected: ${allListings.length}`);
            
            pageNum++;
            await sleep(2000);
        }

    } catch (error) {
        console.error("   ❌ Scrape error:", error);
    } finally {
        await browser.close();
    }

    // Save Logic (Same as before)
    if (allListings.length > 0) {
        const sqlValues = allListings.map(item => {
            const escape = (str) => str ? `'${str.replace(/'/g, "''")}'` : 'NULL';
            return `(${escape(item.title)}, ${item.price}, ${item.service_fee}, ${escape(item.store)}, ${escape(item.condition)}, ${escape(item.image_url)}, ${escape(item.link)}, ${escape(item.year)}, ${escape(item.make)}, ${escape(item.model)}, ${escape(item.part_name)})`;
        }).join(',\n');

        const sqlContent = `
INSERT INTO public.listings (title, price, service_fee, store, condition, image_url, link, year, make, model, part_name)
VALUES
${sqlValues};
`;
        
        const dumpPath = path.join(__dirname, '../../db/scraped_listings.sql');
        fs.writeFileSync(dumpPath, sqlContent); // Overwrite or append? Let's overwrite for clean runs usually, but append is safer for multiple runs. Let's use append for now.
        // Actually, if we use writeFileSync it overwrites. Let's use appendFileSync to match previous logic but ensure newline.
        fs.appendFileSync(dumpPath, `\n-- Batch ${new Date().toISOString()}\n` + sqlContent);
        console.log(`   📝 SQL backup saved to: db/scraped_listings.sql`);

        console.log(`💾 Inserting ${allListings.length} items into Supabase...`);
        const { error } = await supabase.from('listings').insert(allListings);
        
        if (error) {
            console.error('   ❌ Database Insert Error (RLS might be blocking):', error.message);
            console.log('   💡 TIP: Use the SQL file manually if RLS blocks the script.');
        } else {
            console.log('   ✨ Success! Database populated.');
        }
    } else {
        console.log('   ⚠️  No listings found to insert.');
    }
}

const queryArg = process.argv[2] || DEFAULT_SEARCH;

// Only run if called directly (node scrape_ebay.js)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    scrapeEbay(queryArg);
}

export { scrapeEbay };
