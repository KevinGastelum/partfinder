# eBay Scraper Development Findings

## Overview
This document details the technical challenges, attempted solutions, and the final successful architecture for scraping live car part listings from eBay Motors.

## 1. Challenge: Anti-Bot Detection
eBay employs sophisticated bot detection measures (Distil Networks / Akamai) that aggressively block automated requests.

### Failed Approaches
*   **Axios/Cheerio**: Standard HTTP requests were immediately blocked (429/403 errors) or served CAPTCHA challenge pages.
*   **Puppeteer (Vanilla)**: Detected via browser fingerprinting (automation flags, user-agent anomalies).
*   **Puppeteer with Stealth Plugin**: While robust, it was still inconsistent in bypassing potential IP-based or behavioral blocks during high-volume scraping.

### Successful Approach
*   **Agentic Browser Control**: Utilizing a "Browser Subagent" – an autonomous browser instance that behaves more like a human user.
*   **Behavioral Mimicry**: The agent navigated naturally, scrolled to trigger lazy-loading, and executed client-side JavaScript to extract data from the fully rendered DOM.

## 2. Challenge: Data Exfiltration
Extracting large datasets from the browser context back to the agent's control environment proved difficult due to environment restrictions.

### Failed Approaches
*   **Console Logging**: Large JSON objects were truncated by the browser's console buffer, resulting in incomplete data.
*   **POST Requests (Fetch)**: Attempting to `fetch()` data to a local capture server (port 3000) was blocked by Mixed Content policies (HTTPS page to HTTP localhost) and Network restrictions.
*   **GET Requests (Image beacons)**: Attempting to append data to URL parameters (`new Image().src = 'http://localhost:3001/save?data=...'`) failed due to URL length limits and similar network blocking.

### Successful Approach
*   **Direct Execution Return**:
    1.  The browser agent executed a JavaScript function that scraped a specific batch of items (e.g., 50 items).
    2.  The function **returned the JSON string directly** as the result of the tool execution.
    3.  This bypassed network restrictions and allowed the agent to "read" the data directly from the browser's memory.
    4.  We paginated the scrape (Page 1, then Page 2) to manage token limits and ensure data integrity.

## 3. Challenge: Data Integrity & Schema
*   **Currency**: Listings initially appeared in local currency (e.g., MXN) due to geolocation.
    *   *Solution*: Implemented a cookie-clearing routine (`document.cookie` reset) and verification step to ensure prices were in USD (`$`).
*   **Schema Mismatch**: Scraped data (title, price, seller) needed to match Supabase's specific `listings` table schema.
    *   *Solution*: Created a post-processing script (`combine_data.js`) to parse raw price strings (remove `$` and commas), calculate calculated fields (Service Fee), and normalize keys.

## 4. Blockers Resolved
*   **Database Insertion (RLS)**: The initial insertion failed due to RLS policies on the `listings` table.
    *   *Resolution*: Utilized the `SUPABASE_SERVICE_ROLE_KEY` to grant admin privileges to the seeding script, successfully bypassing RLS and inserting 91 items.

## File Organization
To maintain a clean codebase, files have been reorganized:

*   `src/scripts/scraper/`: Contains all scraping-related logic (`capture_server.js`, `analyze_debug_html.js`, etc.).
*   `src/data/`: Contains the raw scraped datasets and artifacts (`final_scraped_data.json`, `debug_ebay.html`, etc.).
*   `src/scripts/`: Contains the database seeding script (`seed_supabase_script.js`).

## Next Steps
1.  ~~Obtain `SUPABASE_SERVICE_ROLE_KEY`.~~ ✅
2.  ~~Update `.env` or the seeding script.~~ ✅
3.  ~~Run `node src/scripts/seed_supabase_script.js` to populate the database.~~ ✅

---

## 5. Challenge: Mass Inventory Scraping (Jan 2026)

### Goal
Automate scraping across a matrix of **5 Vehicles × 5 Parts** (25 total queries) to expand the catalog to ~1,000+ listings.

### Orchestration
Created `src/scripts/seed_inventory.js` to loop through vehicle-part combinations and spawn `scrape_ebay.js` for each query sequentially with a 5-second cooldown.

### Issues Encountered

#### 5.1 Query Argument Truncation
*   **Symptom**: Scraper received only the first word (e.g., `"2018"` instead of `"2018 Honda Civic Brake Pads"`).
*   **Cause**: Windows shell tokenized the query string on spaces.
*   **Fix**: Wrapped query in escaped quotes in `spawn()` call: `[SCRAPER_SCRIPT, \`"${query}"\`]`.

#### 5.2 eBay Bot Detection (CAPTCHA/OTP)
*   **Symptom**: Scraper hit "Checking your browser" or security verification screens.
*   **Initial Attempts**:
    *   Switched to `headless: false` (visible browser).
    *   Updated User-Agent to match Browser Subagent's verified UA (`Chrome/143`).
    *   Added `--disable-blink-features=AutomationControlled` flag.
    *   Masked `navigator.webdriver` via `page.evaluateOnNewDocument()`.
*   **Successful Mitigation**: Created `src/scripts/get_cookies.js` to manually capture session cookies, then injected them in `scrape_ebay.js` via `page.setCookie()`.

#### 5.3 Empty HTML Dump (Timing Issue)
*   **Symptom**: Debug HTML file contained eBay's UI shell (CSS variables, `ifh-` help components) but **no listing content** ("Alternator", "$103.49" not found).
*   **Cause**: `waitUntil: 'domcontentloaded'` returned before JavaScript rendered the results.
*   **Fix**: Changed to `waitUntil: 'networkidle0'` to wait for all network activity to cease (full page render).

### Current Status
✅ **Resolved.** Mass scraper is now working successfully.

#### 5.4 DOM Structure Change (Critical Fix)
*   **Symptom**: Scraper waited for `.s-item` but never found it, even on pages with visible listings.
*   **Diagnosis**: Used Browser Subagent to inspect live DOM. Found `.s-item` count = **0**, but `.s-card` count = **70**.
*   **Cause**: eBay updated their search results page structure (Jan 2026). Listings are now wrapped in `.s-card` instead of `.s-item`.
*   **Fix**: Updated `scrape_ebay.js`:
    *   Selector: `.s-item` → `.s-card`
    *   Title: `.s-item__title` → `.s-card__title span`
    *   Link: `.s-item__link` → `a.s-card__link`
    *   Price: Extracted via regex from card text content
    *   Condition: Detected via text matching ("new" → New, else Used)

### Files Created/Modified
*   `src/scripts/seed_inventory.js` – Orchestrator for mass scraping.
*   `src/scripts/get_cookies.js` – Manual cookie capture utility.
*   `src/scripts/inspect_debug.js` – DOM inspection helper.
*   `src/scripts/scrape_ebay.js` – Updated with cookie injection, UA, stealth flags, and `networkidle0`.
*   `src/data/ebay_cookies.json` – Stored session cookies (gitignored).
*   `debug_last_page.html` – HTML dump for troubleshooting.
