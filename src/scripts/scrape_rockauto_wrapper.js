// Wrapper to call RockAuto Scraper from CLI
const { scrapeRockAuto } = require('../scrapers/rockauto_scraper');

const query = process.argv[2];
if (query) {
    scrapeRockAuto(query);
} else {
    console.error("Please provide a search query.");
}
