
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COOKIES_PATH = path.join(__dirname, '../data/ebay_cookies.json');

// Create data dir if not exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

async function getCookies() {
    console.log("🚀 Launching Browser for Manual Auth...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1366,768']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    console.log("Navigating to eBay...");
    await page.goto('https://www.ebay.com', { waitUntil: 'domcontentloaded' });

    console.log("\n🛑 ACTION REQUIRED 🛑");
    console.log("1. In the browser window, please solve any CAPTCHAs or Log In if prompted.");
    console.log("2. Ensure you can see the eBay homepage and search results normally.");
    console.log("3. Come back here and press ENTER to save cookies.");
    
    // Wait for user input
    await new Promise(resolve => process.stdin.once('data', resolve));

    console.log("🍪 Saving cookies...");
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    
    console.log(`✅ Cookies saved to: ${COOKIES_PATH}`);
    console.log("You can now run the mass scraper!");

    await browser.close();
    process.exit(0);
}

getCookies();
