
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const p1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'scraped_data_p1.json'), 'utf8'));
const p2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'scraped_data_p2.json'), 'utf8'));

const combined = [...p1, ...p2];
const unique = combined
            .filter(item => item.title && item.price && item.title !== 'Shop on eBay' && item.price.includes('$'))
            .map(item => {
                const priceMatch = item.price.match(/[\d,]+\.\d{2}/);
                const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
                return {
                    title: item.title,
                    price: numericPrice,
                    service_fee: parseFloat((numericPrice * 0.30).toFixed(2)),
                    store: item.seller || 'eBay Motors',
                    condition: 'New',
                    image_url: item.image || 'https://via.placeholder.com/150',
                    link: item.link,
                    year: '2018',         // From search context
                    make: 'Honda',        // From search context
                    model: 'Civic',       // From search context
                    part_name: 'Brake Pads' // From search context
                };
            })
            // Remove duplicates based on Link
            .filter((item, index, self) => 
                index === self.findIndex((t) => (
                    t.link === item.link
                ))
            );

fs.writeFileSync(path.join(__dirname, 'final_scraped_data.json'), JSON.stringify(unique, null, 2));
console.log(`Saved ${unique.length} items to final_scraped_data.json`);
