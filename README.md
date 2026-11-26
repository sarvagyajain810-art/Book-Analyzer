# Book Rating Analysis

**Data Science Mini Project**  
**Student:** Sarvagya Jain  
**Project ID:** 122042  
**Section:** B2  
**Academic Year:** 2026  

---

## Project Overview

**Book Rating Analysis** is a full-stack data science web application designed to help readers discover genuinely highly rated books and analyze rating behavior across genres, publication years, and rating sample sizes.

Unlike static front-end mockups, every statistic, chart, recommendation, and exportable report in this project is computed dynamically from real bibliographic metadata and authentic user ratings retrieved from public book APIs and persisted in a structured local SQLite database.

---

## Core Features

1. **Home / Executive Dashboard**
   - Dynamic KPI summary (Total Books Analyzed, Total Ratings Collected, Weighted & Unweighted Average Book Rating, Number of Genres).
   - Prominent catalog search bar with live suggestions and search history.
   - Featured Bayesian confidence-ranked books, popular genres, rating distribution overview chart, and recently discovered books.

2. **Explore Books & Live API Discovery**
   - Multi-facet filtering by Genre, Publication Year range, Minimum Average Rating, Minimum Rating Count, Author, Language, and Data Source.
   - Live external API queries targeting **Google Books API** and **Open Library API**, automatically caching fetched editions into SQLite.
   - Sorting by Highest Rated, Most Rated, Newest, Oldest, and Title A–Z.
   - Grid and List view toggles, pagination, loading skeletons, empty states, and transparent API rate-limit error messages.

3. **Book Details View**
   - Full edition metadata: cover, title, subtitle, authors, publisher, publication date, ISBN-13, ISBN-10, edition ID, normalized primary genre, language, page count, synopsis, and official external link.
   - Side-by-side display of Original Average Rating, Total Rating Count, and Bayesian Confidence-Adjusted Score with visible source attribution.
   - Interactive 1-to-5 star rating distribution bar chart whenever genuine per-star breakdown data is provided by the source API; explicitly displays *"Rating distribution data is not available for this book."* when omitted.

4. **Interactive Data Analytics Dashboard (8 Visualizations)**
   - Average Rating by Genre (with Weighted vs. Unweighted toggle).
   - Rating Count by Genre.
   - Average Rating by Publication Year.
   - Most Rated Books.
   - Highest Rated Books (applying an adjustable minimum rating-count threshold).
   - Rating Distribution Across Books.
   - Interactive Side-by-Side Genre Comparison Tool.
   - Publication Year Trends (Volume vs. Rating Composed Chart).

5. **Honest Confidence-Aware Recommendation System**
   - Implements the Bayesian Weighted Rating formula with a user-adjustable minimum rating threshold `m` (default `50`).
   - Displays both Original Average Rating and Confidence-Adjusted Ranking Score without ever replacing original source ratings.
   - Five transparent categories: **Highly Rated**, **Most Popular**, **Hidden Gems**, **Recently Published**, and **Best in Genre**.

6. **Academic Book Rating Analytics Report**
   - Live, filter-synchronized report formatted for academic submission (`Book Rating Analysis` — `Developed by Sarvagya Jain`).
   - Empirical, programmatically generated key observations (zero fabricated claims).
   - One-click **Download CSV**, **Download PDF**, and **Print Report**.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide React, Motion
- **Backend:** Node.js, Express
- **Database & Caching:** SQLite (`node:sqlite` built-in `DatabaseSync` with WAL mode and parameterized prepared statements)
- **Export:** RFC 4180 CSV generator + `jsPDF` & `jspdf-autotable` for PDF generation
- **External Data Sources:** Google Books API (`books/v1/volumes`) and Open Library API (`openlibrary.org/search.json`, `/works/{id}.json`)

---

## API Usage & Configuration

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Optional environment variable:

- `GOOGLE_BOOKS_API_KEY`: Recommended when running on shared cloud IPs where anonymous Google Books API requests may hit HTTP 429 daily quota limits. Kept strictly on the backend server.

### API Endpoints

- `GET /api/status` — Provider connectivity & cached book counts
- `POST /api/collect` — Trigger live multi-genre catalog sync
- `GET /api/books` — Filtered, sorted, paginated SQLite book catalog
- `GET /api/books/:id` — Single edition metadata + description enrichment
- `GET /api/search/live` — Live search against Google Books API and/or Open Library API
- `GET /api/search/suggestions` — Debounced catalog autocomplete suggestions
- `GET /api/search/history` & `DELETE /api/search/history` — Recent search log
- `GET /api/analytics` — Real-time computation for all 8 dashboard charts
- `GET /api/recommendations` — Bayesian confidence-aware recommendations
- `GET /api/report` — Full analytics report payload

---

## Installation & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (port 3000)
npm run dev

# 3. Build production frontend bundle
npm run build

# 4. Run production server
NODE_ENV=production npm start
```

Open `http://localhost:3000` in your browser.

---

## Data Science Methodology

1. **Unweighted Average of Book Averages:**
   $$\bar{R}_{\text{unweighted}} = \frac{1}{N_{\text{rated}}} \sum_{i=1}^{N_{\text{rated}}} R_i$$
2. **Weighted Average Rating (Across All Individual Ratings):**
   $$\bar{R}_{\text{weighted}} = \frac{\sum_{i} (R_i \times v_i)}{\sum_{i} v_i}$$
3. **Bayesian Confidence-Adjusted Ranking Score:**
   $$W = \frac{v}{v + m} \cdot R + \frac{m}{v + m} \cdot C$$
   where $R$ is the book's genuine average rating, $v$ is its genuine rating count, $C$ is the eligible dataset mean rating, and $m$ is the user-configurable minimum rating count threshold.
4. **Data Hygiene & Honesty Guarantees:**
   - Missing ratings remain `null` and display as `"Not Rated"` / `"No ratings available"`.
   - Each book is assigned a single normalized primary genre for aggregate metrics so multi-tagged books are never double-counted.
   - Publication-year analysis strictly extracts verified 4-digit years (`1450–2026`) and excludes missing/incomplete dates without estimation.
   - Distinct sources and editions are stored under source-scoped IDs and never merged by title similarity.

---

## Known Limitations

- Anonymous Google Books API requests from shared cloud IPs can receive HTTP 429 quota errors; configuring `GOOGLE_BOOKS_API_KEY` resolves this, while Open Library API provides live real-world ratings and star distributions out of the box.
- Google Books API does not return per-star rating breakdowns (`1★–5★`), so distribution charts are displayed only for books whose source API supplies genuine per-star counts.
- User ratings across public book platforms reflect self-selected readers and vary in sample size by platform; source attribution is preserved alongside every rating.
