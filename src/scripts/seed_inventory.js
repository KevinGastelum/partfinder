
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
    console.log("🚀 Starting Expanded Inventory Scrape (Optimized Mode)...");
    console.log(`Target: ${VEHICLES.length} Vehicles x ${PARTS.length} Parts = ${totalJobs} Queries`);
    console.log(`Mode: Parallel Batches (Speed x3)`);
    console.log(`Estimated Items: ~${totalJobs * 100} listings\n`);
    
    // Create job queue
    const queue = [];
    let id = 1;
    for (const vehicle of VEHICLES) {
        for (const part of PARTS) {
            queue.push({ id: id++, query: `${vehicle} ${part}` });
        }
    }

    // Process in batches
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`⚡ Processing Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(queue.length/BATCH_SIZE)}`);
        console.log(`   Detailed Jobs: ${batch.map(b => `#${b.id}`).join(', ')}`);
        console.log(`${'='.repeat(60)}`);

        // Run batch in parallel
        await Promise.all(batch.map(job => runScraper(job.query)));
        
        // Dynamic cool down between batches
        const delay = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
        console.log(`💤 Batch complete. Cooling down for ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✨ All Jobs Complete!");
    console.log(`Total Queries: ${totalJobs}`);
    console.log("=".repeat(60));
}

main();
