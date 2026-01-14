
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRAPER_SCRIPT = path.join(__dirname, 'scrape_ebay.js');

const VEHICLES = [
    "2018 Honda Civic",
    "2015 Ford F-150",
    "2020 Toyota Camry",
    "2016 Chevrolet Silverado",
    "2019 Nissan Altima"
];

const PARTS = [
    "Brake Pads",
    "Alternator",
    "Headlight Assembly",
    "Starter Motor",
    "Shock Absorber"
];

async function runScraper(query) {
    return new Promise((resolve, reject) => {
        console.log(`\n📦 Orchestrator: Queuing scrape for "${query}"...`);
        
        const child = spawn('node', [SCRAPER_SCRIPT, query], {
            stdio: 'inherit', // Pipe output to parent console
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Finished: "${query}"`);
                resolve();
            } else {
                console.error(`❌ Failed: "${query}" (Exit Code: ${code})`);
                resolve(); // Resolve anyway to continue the loop
            }
        });

        child.on('error', (err) => {
            console.error(`❌ Spawn Error:`, err);
            resolve();
        });
    });
}

async function main() {
    console.log("🚀 Starting Mass Inventory Expansion...");
    console.log(`Target: ${VEHICLES.length} Vehicles x ${PARTS.length} Parts = ${VEHICLES.length * PARTS.length} Queries`);
    
    let count = 1;
    for (const vehicle of VEHICLES) {
        for (const part of PARTS) {
            const query = `${vehicle} ${part}`;
            console.log(`\n---------------------------------------------------`);
            console.log(`Job ${count}/${VEHICLES.length * PARTS.length}: ${query}`);
            console.log(`---------------------------------------------------`);
            
            await runScraper(query);
            
            // Cool down between jobs
            console.log("Waiting 5 seconds to be nice to eBay...");
            await new Promise(r => setTimeout(r, 5000));
            count++;
        }
    }
    console.log("\n✨ All Jobs Finished. Database should be populated.");
}

main();
