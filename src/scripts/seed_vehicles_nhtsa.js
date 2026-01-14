
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.existsSync(envPath) 
    ? Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(Boolean).map(line => line.split('=')))
    : {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const YEARS_TO_SEED = [2018, 2019, 2020, 2021, 2022, 2023, 2024]; // Expanded to include scraped data year

async function fetchNHTSAData(year) {
    console.log(`\n🚗 Fetching data for ${year}...`);
    try {
        // 1. Get All Makes
        const makesUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json`;
        const makesRes = await axios.get(makesUrl);
        const allMakes = makesRes.data.Results;
        
        // Filter for popular makes to save time/space for this demo
        const POPULAR_MAKES = ['HONDA', 'TOYOTA', 'FORD', 'CHEVROLET', 'BMW', 'MERCEDES-BENZ', 'AUDI'];
        const targetMakes = allMakes.filter(m => POPULAR_MAKES.includes(m.MakeName.toUpperCase()));

        let vehicles = [];

        for (const make of targetMakes) {
            console.log(`  > Processing ${make.MakeName}...`);
            
            // 2. Get Models for Make/Year
            const modelsUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${make.MakeName}/modelyear/${year}?format=json`;
            const modelsRes = await axios.get(modelsUrl);
            
            for (const model of modelsRes.data.Results) {
                // NHTSA doesn't always have "Trim" easily accessible in this endpoint, 
                // so we will simulate the "Base" trim or handle it if we find it.
                // For the "AutoZone Feel", we create a clean entry.
                
                vehicles.push({
                    year: year,
                    make: make.MakeName,
                    model: model.Model_Name,
                    submodel: 'Base', // Placeholder as NHTSA doesn't always provide trim in this specific list
                    engine: 'N/A'     // Placeholder
                });
            }
        }
        return vehicles;

    } catch (err) {
        console.error(`Error fetching ${year}:`, err.message);
        return [];
    }
}

async function seed() {
    for (const year of YEARS_TO_SEED) {
        const vehicles = await fetchNHTSAData(year);
        
        if (vehicles.length > 0) {
            const { error } = await supabase.from('vehicles').insert(vehicles);
            if (error) console.error('Error inserting:', error);
            else console.log(`✅ Indexed ${vehicles.length} vehicles for ${year}`);
        }
    }
    console.log('🎉 Vehicle Database Populated!');
}

seed();
