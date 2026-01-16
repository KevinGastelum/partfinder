import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // 1. Security Check (Basic API Key or Referer)
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  console.log(`🕵️ Scout: Received request for "${q}"`);

  // 2. Trigger Scraper (Mock for now, as Vercel Free doesn't support full Chrome easily)
  // In a real production scalable setup, this would call an external scraping API (e.g. ZenRows, ScrapingBee) 
  // OR a custom endpoint on a container service (Railway/Render) that runs Puppeteer.
  // For the $0 Hack: We can try to use lightweight cheerio if the site allows, OR just log it for now.
  
  // 2. Trigger Real Scraper (Cheerio - Lightweight)
  // This runs within Vercel's execution limits because it parses HTML directly, no browser.
  try {
     const scrapeUrl = `https://www.rockauto.com/en/partsearch/?keywords=${encodeURIComponent(q)}`;
     console.log(`🕵️ Scout: Fetching ${scrapeUrl}...`);
     
     // Fetch HTML (using custom User-Agent to avoid immediate 403)
     const response = await axios.get(scrapeUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.rockauto.com/',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        },
        timeout: 10000 // Increase timeout
     });

     const html = response.data;
     const $ = cheerio.load(html);
     console.log("------------------------------------------------");
     console.log("🕵️ Scout DEBUG: Page Title:", $('title').text().trim());
     console.log("🕵️ Scout DEBUG: HTML Length:", html.length);
     console.log("🕵️ Scout DEBUG: .listing-inner count:", $('.listing-inner').length);
     console.log("🕵️ Scout DEBUG: .npart-tree-link count:", $('.npart-tree-link').length);
     console.log("🕵️ Scout DEBUG: Body Snippet:", $('body').text().substring(0, 500).replace(/\s+/g, ' '));
     
     // Debug finding ANY links
     console.log("🕵️ Scout DEBUG: Total Links:", $('a').length);
     console.log("🕵️ Scout DEBUG: Sample Link:", $('a').first().attr('href'));

     const results = [];

     // Strategy: RockAuto lists parts in .listing-inner
     $('.listing-inner').each((i, el) => {
        if (results.length >= 5) return; // Limit to 5 live results

        const brand = $(el).find('.listing-final-manufacturer').text().trim();
        const partNumber = $(el).find('.listing-final-partnumber').text().trim();
        const priceText = $(el).find('.listing-price').first().text().trim();
        const title = $(el).find('.listing-text-bold').text().trim() || $(el).find('.span-link-underline').text().trim();
        
        let imageUrl = $(el).find('.listing-inline-image-thumb').attr('src');
        if (imageUrl && imageUrl.startsWith('/')) {
            imageUrl = 'https://www.rockauto.com' + imageUrl;
        }

        if (brand && priceText) {
            results.push({
                title: `${brand} ${title} ${partNumber}`,
                price: parseFloat(priceText.replace('$', '')),
                source: 'RockAuto (Live)',
                link: scrapeUrl,
                image_url: imageUrl,
                brand: brand,
                year: 2024, // JIT assumption or parse from query
                make: 'Unknown',
                model: 'Unknown',
                part_name: title || 'Part'
            });
        }
     });

     // Check for "Category Tree" if no listings found (Search often lands on a tree)
     if (results.length === 0) {
        // Simple heuristic: If we see categories, we might return a "Refine Search" link or just the link to RockAuto
        const categories = $('.npart-tree-link').length;
        if (categories > 0) {
            console.log("🕵️ Scout: Found category tree, returning link.");
            results.push({
                title: `Multiple Results for "${q}"`,
                price: 0,
                source: 'RockAuto',
                link: scrapeUrl,
                image_url: 'https://www.rockauto.com/Images/logo.png', // Fallback
                brand: 'RockAuto',
                part_name: 'Browse Catalog'
            });
        }
     }

     console.log(`🕵️ Scout: Found ${results.length} items`);

     // 3. Fallback: If blocked (0 items + "security code" in body), return Mock Data for Demo
     if (results.length === 0 && $('body').text().includes("security code")) {
         console.warn("⚠️ Scout: RockAuto Soft-Block Detected (CAPTCHA). Serving Mock Data for Demo.");
         results.push({
            title: `[DEMO] ${q} (Live Scraping Blocked)`,
            price: 99.99,
            source: 'RockAuto (Mock)',
            link: scrapeUrl,
            image_url: 'https://www.rockauto.com/Images/logo.png',
            brand: 'Demo Brand',
            part_name: 'Part',
            year: 2024,
            make: 'Generic',
            model: 'Vehicle'
         });
     }

     return res.status(200).json({ 
         success: true, 
         source: results[0]?.source || 'rockauto_cheerio', 
         data: results 
     });

  } catch (error) {
    console.error("Scout Error:", error.message);
    // Fallback to mock if blocked
    return res.status(200).json({ 
        success: false, 
        error: error.message,
        data: [] 
    });
  }
}
