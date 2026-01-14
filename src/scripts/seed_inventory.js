
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRAPER_SCRIPT = path.join(__dirname, 'scrape_ebay.js');

// Tier 1 Vehicles (Top 10 US Sellers) - Years 2008-2023
const VEHICLES = [
    "2012 Ford F-150",
    "2015 Chevrolet Silverado",
    "2014 RAM 1500",
    "2018 Toyota RAV4",
    "2016 Honda CR-V",
    "2017 Toyota Camry",
    "2019 Honda Civic",
    "2020 Nissan Rogue",
    "2015 Chevrolet Equinox",
    "2018 Toyota Corolla"
];

// Priority 1 Parts (High Demand / Frequent Replacement)
const PARTS = [
    // Brakes & Suspension
    "Brake Pads",
    "Brake Rotors",
    "Shock Absorber",
    "Control Arm",
    "Wheel Bearing",
    // Electrical & Engine
    "Alternator",
    "Starter Motor",
    "Ignition Coil",
    "O2 Sensor",
    // Cooling & HVAC
    "Radiator",
    "Water Pump",
    "AC Compressor",
    // Lighting
    "Headlight Assembly",
    "Tail Light",
    // Fuel & Drivetrain
    "Fuel Pump",
    "CV Axle"
];

async function runScraper(query) {
    return new Promise((resolve, reject) => {
        console.log(`\n📦 Orchestrator: Queuing scrape for "${query}"...`);
        
        const child = spawn('node', [SCRAPER_SCRIPT, `"${query}"`], {
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Finished: "${query}"`);
                resolve();
            } else {
                console.error(`❌ Failed: "${query}" (Exit Code: ${code})`);
                resolve(); // Continue the loop
            }
        });

        child.on('error', (err) => {
            console.error(`❌ Spawn Error:`, err);
            resolve();
        });
    });
}

async function main() {
    const totalJobs = VEHICLES.length * PARTS.length;
    console.log("🚀 Starting Expanded Inventory Scrape...");
    console.log(`Target: ${VEHICLES.length} Vehicles x ${PARTS.length} Parts = ${totalJobs} Queries`);
    console.log(`Estimated Items: ~${totalJobs * 100} listings\n`);
    
    let count = 1;
    for (const vehicle of VEHICLES) {
        for (const part of PARTS) {
            const query = `${vehicle} ${part}`;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Job ${count}/${totalJobs}: ${query}`);
            console.log(`${'='.repeat(60)}`);
            
            await runScraper(query);
            
            // Cool down between jobs (be nice to eBay)
            console.log("Waiting 5 seconds before next job...");
            await new Promise(r => setTimeout(r, 5000));
            count++;
        }
        
        // Longer break between vehicles
        console.log(`\n💤 Finished ${vehicle}. Taking 10 second break...\n`);
        await new Promise(r => setTimeout(r, 10000));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✨ All Jobs Complete!");
    console.log(`Total Queries: ${totalJobs}`);
    console.log(`Estimated Items Added: ~${totalJobs * 100}`);
    console.log("=".repeat(60));
}

main();
