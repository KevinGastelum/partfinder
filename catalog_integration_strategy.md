# Vehicle & Parts Catalog Integration Strategy

## Goal
To integrate a comprehensive catalog of vehicles (Year/Make/Model/Trim) and a structured parts taxonomy into the application, enabling precise search and compatibility filtering.

## 1. Data Source Options

### Option A: NHTSA vPIC API (Free, Government)
*   **Pros**: authoritative, free, comprehensive for US market.
*   **Cons**: API-based (latency), requires complex chaining (Get Makes -> Get Models -> Get Trims), strict rate limits.
*   **Verdict**: Good for verification, but too slow for a primary user-facing dropdown menu.

### Option B: Open Source Database (Recommended)
*   **Source**: Repositories like `plowman/open-vehicle-db` or `car-query-api` dumps.
*   **Pros**: Fast (local SQL/JSON), offline compatible, easier to query for dropdowns.
*   **Cons**: Requires manual updates (snapshot in time), data cleaning.
*   **Verdict**: **Best for UX**. We can seed our own `vehicles` table for instant searching.

### Option C: Commercial APIs (DataOne, Edmunds, etc.)
*   **Pros**: High accuracy, images, deep specs (ACES/PIES standard).
*   **Cons**: Very expensive ($$$/month), strict licensing.
*   **Verdict**: Overkill for the current stage.

## 2. Proposed Database Schema

We will move from unstructured text fields to relational tables.

### 2.1 `vehicles` Table (The "Master" List)
Stores unique combinations of vehicle configurations.
*   `id`: UUID
*   `year`: Integer (e.g., 2018)
*   `make`: Text (e.g., "Honda")
*   `model`: Text (e.g., "Civic")
*   `trim`: Text (Optional, e.g., "EX-L")
*   `engine`: Text (Optional, e.g., "1.5L Turbo")
*   `created_at`: Typescript

### 2.2 `categories` Table (The Taxonomy)
Hierarchical structure for parts.
*   `id`: UUID
*   `name`: Text (e.g., "Brake Pads")
*   `slug`: Text (e.g., "brake-pads")
*   `parent_id`: UUID (Self-referencing FK, e.g., points to "Brakes")
*   `icon_url`: Text

### 2.3 Updated `listings` Table
Enhance the existing table to link to the new catalogs.
*   `vehicle_id`: FK to `vehicles.id` (Nullable: if a part is specific to one car)
*   `category_id`: FK to `categories.id` (Nullable)
*   `compatibility_json`: JSONB (For parts that fit *multiple* vehicles, storing an array of vehicle IDs or YMM strings)

## 3. Implementation Plan

### Phase 1: Database Foundation
1.  Create `vehicles` and `categories` tables in Supabase.
2.  Seed `categories` with a "Essential 50" list (Common parts: Brakes, Alternators, Filters, etc.).

### Phase 2: Vehicle Seeding
1.  Write a script to fetch/import a 2010-2024 vehicle dataset (focus on popular years first to keep DB small).
2.  Populate the `vehicles` table.

### Phase 3: "Smart" Scraping
1.  Update the scraper to match scraped data against our new `vehicles` and `categories` tables.
2.  If a listing says "2018 Honda Civic", we look up the `vehicle_id` and store it.

## 4. Immediate Recommendation

**Start with Option B (Open Source JSON)**.
I will create a seed script that populates the `vehicles` table with a curated list of popular cars (e.g., 2015-2025) to enable immediate filtering functionality in the frontend without external API dependency.
