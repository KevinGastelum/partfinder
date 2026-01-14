
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
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    
    // Set a realistic User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    let pageNum = 1;

    try {
        while (allListings.length < TARGET_COUNT && pageNum <= 5) {
            const url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_pgn=${pageNum}`;
            console.log(`   Mining Page ${pageNum}... (${url})`);
            
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            // Wait for items to likely be there
            try {
                // Wait for either the item list or a potential captcha/error
                await page.waitForSelector('.s-item', { timeout: 10000 });
            } catch (e) {
                console.log("   ⚠️  Timed out waiting for .s-item. Checking for bot detection...");
                const content = await page.content();
                if (content.includes('security check') || content.includes('captcha')) {
                    console.error("   ❌ Hit eBay CAPTCHA/Bot protection.");
                } else {
                    console.log("   ❌ Unknown page state. Saving screenshot.");
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

            // Extract items in browser context
            const items = await page.evaluate(() => {
                const results = [];
                const itemEls = document.querySelectorAll('.s-item');
                
                itemEls.forEach(el => {
                    const titleEl = el.querySelector('.s-item__title');
                    const priceEl = el.querySelector('.s-item__price');
                    const linkEl = el.querySelector('.s-item__link');
                    const imageEl = el.querySelector('.s-item__image-img');
                    const sellerEl = el.querySelector('.s-item__seller-info-text');
                    const conditionEl = el.querySelector('.SECONDARY_INFO');

                    const title = titleEl ? titleEl.innerText.trim() : null;
                    if (!title || title.toLowerCase() === 'shop on ebay') return;

                    const priceText = priceEl ? priceEl.innerText : null;
                    // Generic price regex
                    const priceMatch = priceText ? priceText.match(/[\d,]+\.\d{2}/) : null;
                    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;

                    if (!price) return;

                    results.push({
                        title,
                        price,
                        link: linkEl ? linkEl.href : null,
                        image_url: imageEl ? imageEl.src : null,
                        store: sellerEl ? sellerEl.innerText.trim().split(' ')[0] : 'eBay Seller',
                        condition: conditionEl ? conditionEl.innerText.trim() : 'Used' // Default to used if not specified
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
scrapeEbay(queryArg);
