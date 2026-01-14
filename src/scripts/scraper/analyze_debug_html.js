import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('c:/Users/Ivonne/Documents/Coding/partfinder/debug_ebay.html', 'utf8');
const $ = cheerio.load(html);

// Find the script containing the data
const scripts = $('script').toArray();
let dataScript = null;

for (const script of scripts) {
    const content = $(script).html();
    if (content && content.includes('window.$M_fbd99063_C')) {
        console.log('Found candidate script starting with:', content.substring(0, 100));
        dataScript = content;
        break;
    }
}

if (!dataScript) {
    console.log('Could not find data script. Printing first 50 chars of all scripts:');
    scripts.forEach((s, i) => {
        const c = $(s).html() || '';
        console.log(`Script ${i}: ${c.substring(0, 50)}...`);
    });
    process.exit(1);
}

// Extract JSON
const startMarker = '$M_fbd99063_C=(window.$M_fbd99063_C||[]).concat(';
const endMarker = ');';
const startIndex = dataScript.indexOf(startMarker) + startMarker.length;
const endIndex = dataScript.lastIndexOf(endMarker);

const jsonString = dataScript.substring(startIndex, endIndex);

try {
    const data = JSON.parse(jsonString);
    console.log('Successfully parsed JSON data');
    
    // Recursively search for items
    function findItems(obj, items = []) {
        if (!obj) return items;
        
        // Check if this object looks like an item
        // eBay items usually have a title, price, and image
        if (obj.title && obj.price && (obj.image || obj.thumbnail)) {
             // This is a candidate, but let's be more specific if possible. 
             // "title" might be an object with textSpans
        }

        // The structure seems to be nested in "w" or "o"
        // Let's look for known keys from the snippet I saw: "itemCountWithStyles"
        
        if (Array.isArray(obj)) {
            obj.forEach(item => findItems(item, items));
        } else if (typeof obj === 'object') {
            // Check for specific eBay listing signatures
            // e.g. "listingId", "shippingOptions", "currentPrice"
            if (obj.listingId) {
                items.push(obj);
            }
            
            Object.values(obj).forEach(val => findItems(val, items));
        }
        return items;
    }

    // Let's dump the structure of the first element in the array to see what we're dealing with
    // because "listingId" might not be the key.
    
    // The previously viewed JSON showed structure like:
    // {"o":{"w":[["s0-2-54-0-9-8-4-4-0-3-0-1[0]-0-20-3-0-0-1",0,{},{"f":1}],...
    
    // It looks like a flat map of components.
    // Let's look for objects that contain "title" and "price" text.
    
    const potentialItems = [];
    JSON.stringify(data, (key, value) => {
        if (key === 'title' && typeof value === 'object' && value._type === 'TextualDisplay') {
             // Found a title, let's look at the parent
             // This uses the replacer to walk, but we need the parent.
        }
        return value;
    });

    // Better approach: Walk the tree and look for objects with "Item" type or similar
    function walk(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        if (obj._type === 'TextualDisplay' && obj.textSpans) {
             const text = obj.textSpans.map(s => s.text).join('');
             if (text.toLowerCase().includes('brake pads')) {
                 // console.log(`Found "brake pads" at ${path}:`, JSON.stringify(obj).substring(0, 100));
             }
        }
        
        // Search for pricing
        if (obj.price || (obj.textSpans && JSON.stringify(obj.textSpans).includes('$'))) {
            // console.log(`Found price at ${path}`);
        }

        if (Array.isArray(obj)) {
            obj.forEach((item, i) => walk(item, `${path}[${i}]`));
        } else {
            Object.keys(obj).forEach(key => walk(obj[key], `${path}.${key}`));
        }
    }
    
    // Let's just output the `o.w` array structure summary
    if (data.o && data.o.w) {
        console.log('Found o.w array with length:', data.o.w.length);
        // It seems `o.w` is a list of [id, index, model, flags]
        // Let's look at the models
        const models = data.o.w.map(entry => entry[2]).filter(m => m && Object.keys(m).length > 0);
        console.log('Found', models.length, 'models');
        
        // Inspect the models for listings
        const listingModels = models.filter(m => {
            const s = JSON.stringify(m);
            return s.includes('title') && s.includes('price'); 
        });
        
        console.log('Found', listingModels.length, 'potential listing models');
        if (listingModels.length > 0) {
            console.log('Sample model:', JSON.stringify(listingModels[0], null, 2));
        }
    } else if (Array.isArray(data)) {
        // The data might be an array of objects being concatenated
        // [ {o: ...} ]
        console.log('Root data is array');
        data.forEach((d, i) => {
             if (d.o && d.o.w) {
                 console.log(`Item ${i} has o.w with length ${d.o.w.length}`);
                 const models = d.o.w.map(entry => entry[2]).filter(m => m && Object.keys(m).length > 0);
                 const listingModels = models.filter(m => {
                    const s = JSON.stringify(m);
                    return s.toLowerCase().includes('brake pads') && (s.includes('price') || s.includes('currentPrice')); 
                 });
                 console.log(`  Found ${listingModels.length} potential listings in item ${i}`);
                 if (listingModels.length > 0) {
                     console.log('  Sample listing:', JSON.stringify(listingModels[0], null, 2));
                 }
             }
        });
    }

} catch (e) {
    console.error('Error parsing JSON:', e);
}
