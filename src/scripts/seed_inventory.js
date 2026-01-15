
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRAPER_SCRIPT = path.join(__dirname, 'scrape_ebay.js');


// Tier 1 Vehicle Models (Top US Sellers)
const MODELS = [
    { make: "Ford", model: "F-150" },
    { make: "Chevrolet", model: "Silverado" },
    { make: "RAM", model: "1500" },
    { make: "Toyota", model: "RAV4" },
    { make: "Honda", model: "CR-V" },
    { make: "Toyota", model: "Camry" },
    { make: "Honda", model: "Civic" },
    { make: "Nissan", model: "Rogue" },
    { make: "Chevrolet", model: "Equinox" },
    { make: "Toyota", model: "Corolla" }
];

// Target Years: 2008 - 2023 (16 Years)
const START_YEAR = 2008;
const END_YEAR = 2023;

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

async function runScraper(query, useRockAuto = false) {
    return new Promise((resolve, reject) => {
        const scriptToRun = useRockAuto ? 'src/scripts/scrape_rockauto_wrapper.js' : SCRAPER_SCRIPT;
        console.log(`\n📦 Orchestrator: Queuing scrape for "${query}" using ${useRockAuto ? 'RockAuto' : 'eBay'}...`);
        
        const child = spawn('node', [scriptToRun, `"${query}"`], {
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
    // Generate Year + Make + Model combinations
    const VEHICLE_QUERIES = [];
    
    for (const car of MODELS) {
        for (let year = START_YEAR; year <= END_YEAR; year++) {
            VEHICLE_QUERIES.push(`${year} ${car.make} ${car.model}`);
        }
    }
    
    const totalJobs = VEHICLE_QUERIES.length * PARTS.length;
    console.log("🚀 Starting Expanded Inventory Scrape (Optimized Mode)...");
    console.log(`Target: ${MODELS.length} Models x ${END_YEAR - START_YEAR + 1} Years (${START_YEAR}-${END_YEAR})`);
    console.log(`Total Vehicles: ${VEHICLE_QUERIES.length}`);
    console.log(`Parts per Vehicle: ${PARTS.length}`);
    console.log(`Total Jobs: ${totalJobs} Queries`);
    console.log(`Mode: Parallel Batches (Speed x3)`);
    console.log(`Estimated Items: ~${totalJobs * 100} listings\n`);
    
    // Create job queue
    const queue = [];
    let id = 1;
    for (const vehicle of VEHICLE_QUERIES) {
        for (const part of PARTS) {
            queue.push({ id: id++, query: `${vehicle} ${part}` });
        }
    }

    // Process in batches
    const BATCH_SIZE = 6; // Increased from 3
    
    // Choose Scraper based on user input or random
    const USE_ROCKAUTO = process.argv.includes('--rockauto');
    const SCRAPER_CMD = USE_ROCKAUTO ? 'src/scripts/scrape_rockauto_wrapper.js' : SCRAPER_SCRIPT; 
    
    if (USE_ROCKAUTO) console.log("🌟 Source: RockAuto (Experimental)");

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`⚡ Processing Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(queue.length/BATCH_SIZE)}`);
        console.log(`   Detailed Jobs: ${batch.map(b => `#${b.id} ${b.query}`).join('\n                  ')}`);
        console.log(`${'='.repeat(60)}`);

        // Run batch in parallel
        await Promise.all(batch.map(job => runScraper(job.query, USE_ROCKAUTO)));
        
        // Dynamic cool down between batches
        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds (Reduced)
        console.log(`💤 Batch complete. Cooling down for ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✨ All Jobs Complete!");
    console.log(`Total Queries: ${totalJobs}`);
    console.log("=".repeat(60));
}

main();
