
import puppeteer from 'puppeteer';

const URL = 'https://www.ebay.com/sch/i.html?_nkw=2018%20Honda%20Civic%20Brake%20Pads&_pgn=1';

async function inspect() {
    console.log("🕵️ Inspecting page structure...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1366,768']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    console.log("Navigating...");
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    
    console.log("Waiting 15 seconds for you to verify page load...");
    await new Promise(r => setTimeout(r, 15000));

    console.log("Extracting classes...");
    const data = await page.evaluate(() => {
        // Try to find anything that looks like a listing
        const items = document.querySelectorAll('.s-item');
        const listItems = document.querySelectorAll('li[id^="item"]');
        const allDivs = Array.from(document.querySelectorAll('div')).slice(0, 50).map(d => d.className);

        return {
            sItemCount: items.length,
            listItemCount: listItems.length,
            first5DivClasses: allDivs,
            title: document.title,
            url: window.location.href
        };
    });

    console.log("\n--- REPORT ---");
    console.log(`Current URL: ${data.url}`);
    console.log(`Page Title: ${data.title}`);
    console.log(`.s-item count: ${data.sItemCount}`);
    console.log(`li[id^="item"] count: ${data.listItemCount}`);
    console.log("Div Classes Sample:", data.first5DivClasses);
    console.log("--------------\n");

    await browser.close();
}

inspect();
