
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import UserAgent from 'fake-useragent';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SEARCH = "2018 Honda Civic Brake Pads";
const TARGET_COUNT = 30; // 30 per run to test safely, can increase loop for 100

const SERVICE_FEE_PERCENT = 0.30;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeEbay(query) {
    console.log(`🚀 Starting scrape for: "${query}"`);
    const encodedQuery = encodeURIComponent(query);
    let allListings = [];
    let page = 1;

    // We'll loop until we have enough or hit a limit
    while (allListings.length < TARGET_COUNT && page <= 3) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_pgn=${page}`;
        console.log(`   Mining Page ${page}... (${url})`);

        try {
            const userAgent = new UserAgent();
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent.random,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            });

            const $ = cheerio.load(data);
            const items = $('.s-item__wrapper');

            if (items.length === 0) {
                console.log("   ⚠️  No items found on this page. Stopping.");
                break;
            }

            items.each((i, el) => {
                try {
                    // Check if it's a "Shop on eBay" header item (garbage)
                    const title = $(el).find('.s-item__title').text().trim();
                    if (title === "Shop on eBay" || !title) return;

                    const priceText = $(el).find('.s-item__price').text().trim();
                    // Extract numeric price (remove '$' and ',')
                    const priceMatch = priceText.match(/[\d,]+\.\d{2}/); 
                    if (!priceMatch) return;
                    
                    const price = parseFloat(priceMatch[0].replace(/,/g, ''));
                    const link = $(el).find('.s-item__link').attr('href');
                    const image_url = $(el).find('.s-item__image-img').attr('src');
                    const store = $(el).find('.s-item__seller-info-text').text().trim().split(' ')[0] || 'eBay Seller';
                    const condition = $(el).find('.SECONDARY_INFO').text().trim() || 'Used';

                    // Parse query for metadata
                    // Simple heuristic: assuming query format "Year Make Model Part"
                    const searchParts = query.split(' ');
                    const year = searchParts[0] || 'Unknown';
                    const make = searchParts[1] || 'Unknown';
                    const model = searchParts[2] || 'Unknown';
                    const part_name = searchParts.slice(3).join(' ') || 'Car Part';

                    allListings.push({
                        title,
                        price,
                        service_fee: (price * SERVICE_FEE_PERCENT).toFixed(2),
                        store: "eBay - " + store,
                        condition,
                        image_url,
                        link,
                        year,
                        make,
                        model,
                        part_name
                    });
                } catch (err) {
                    // Skip bad items
                }
            });

            console.log(`   ✅ Page ${page} mined: Found ${allListings.length} total items so far.`);
            page++;
            await sleep(2000); // Be polite

        } catch (error) {
            console.error(`   ❌ Failed to fetch page ${page}:`, error.message);
            break;
        }
    }

    // output SQL file regardless of insert success (reliable backup)
    if (allListings.length > 0) {
        const fs = require('fs');
        const path = require('path');
        
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
        fs.appendFileSync(dumpPath, sqlContent);
        console.log(`   📝 Appended ${allListings.length} items to SQL file: db/scraped_listings.sql`);

        console.log(`💾 Attempting direct insert of ${allListings.length} listings into database...`);
        const { error } = await supabase.from('listings').insert(allListings);
        
        if (error) {
            console.error('   ❌ Database Insert Error (RLS likely):', error.message);
            console.log('   💡 TIP: Run the db/scraped_listings.sql file in your Supabase SQL Editor.');
        } else {
            console.log('   ✨ Success! Database updated.');
        }
    } else {
        console.log('   ⚠️  No listings found to insert.');
    }
}

// Get query from args or default
const queryArg = process.argv[2] || DEFAULT_SEARCH;
scrapeEbay(queryArg);
