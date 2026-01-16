# Project Findings & Architectural Decisions

## 1. Zero-Cost Scaling Architecture (Just-In-Time)
We shifted from a "Mass Scrape" approach (extracting 200k+ items upfront) to a **Just-In-Time (JIT)** model to stay within free tier limits.
- **Concept**: Treat the database as a "Cache" rather than a "Library".
- **Mechanism**: If a user search yields 0 results, a real-time "Scout" scraper is triggered to fetch data from RockAuto/eBay instantly.
- **Benefits**:
    - **$0 Storage Cost**: Only popular items are stored.
    - **Freshness**: Data is always retrieved live when needed.
    - **Sustainability**: "Janitor" cron job cleans up old/unused listings.

## 2. Admin Dashboard Performance
- **Issue**: Client-side filtering of 50k+ rows caused UI lag.
- **Solution**: Implemented **Server-Side Aggregation**.
    - `fetchAggregates()` retrieves counts for Faceted Search (Year, Make, Part) directly from Supabase.
    - Pagination is handled server-side (`.range()`).
    - Cross-filtering is handled via efficient SQL queries rather than JS array filtering.

## 3. Scraper Anti-Bot Improvements
- **RockAuto**:
    - Uses a hierarchical "Tree" structure for parts.
    - **Solution**: Scraper detects if a list is flat or nested. If nested, it heuristically clicks the first "Part" category.
- **eBay**:
    - **Stealth**: heavily relies on `puppeteer-extra-plugin-stealth` and randomized User-Agents.
    - **Optimization**: Blocks images/fonts to speed up page loads by 3x.

## Key Artifacts
- **[Architecture Strategy](architecture_scaling.md)**: The blueprint for the JIT engine.
- **[Task List](task.md)**: Master checklist of progress.
- **[Walkthrough](walkthrough.md)**: Visual guide of completed features.
- **[Implementation Plan](implementation_plan.md)**: Technical specs.

## Pending Investigations
- **CarParts.com**: Currently blocks all automated requests (403 Forbidden). Deprioritized in favor of RockAuto.
- **Vercel Limits**: Running Puppeteer on Vercel Free Tier (Serverless Functions) has a 50MB size limit. We may need a separate "Scraper Microservice" (e.g., on Railway/Render) or use a specialized API if volume grows.
