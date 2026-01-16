// Wrapper to call RockAuto Scraper from CLI
import { scrapeRockAuto } from '../scrapers/rockauto_scraper.js';

const query = process.argv[2];
if (query) {
    scrapeRockAuto(query);
} else {
    console.error("Please provide a search query.");
}
