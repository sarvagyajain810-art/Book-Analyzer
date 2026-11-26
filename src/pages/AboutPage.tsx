export function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      {/* Header & Academic Profile */}
      <header className="space-y-4 border-b border-[#F5F1E8]/10 pb-8">
        <p className="text-xs font-medium tracking-wide text-[#C6A96B]">
          Data Science Mini Project Documentation
        </p>
        <h1 className="font-serif text-3xl font-semibold text-[#F5F1E8] sm:text-4xl">
          About Book Rating Analysis
        </h1>
        <p className="text-base leading-relaxed text-[#A5ADBC]">
          An empirical web application designed to help readers discover genuinely highly rated
          books and examine rating behavior across genres, publication years, and sample sizes.
        </p>

        <dl className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-3.5">
            <dt className="text-[11px] text-[#A5ADBC]">Student</dt>
            <dd className="mt-1 text-sm font-semibold text-[#F5F1E8]">Sarvagya Jain</dd>
          </div>
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-3.5">
            <dt className="text-[11px] text-[#A5ADBC]">Project ID</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-[#C6A96B]">122042</dd>
          </div>
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-3.5">
            <dt className="text-[11px] text-[#A5ADBC]">Section</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-[#F5F1E8]">B2</dd>
          </div>
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-3.5">
            <dt className="text-[11px] text-[#A5ADBC]">Academic Year</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-[#F5F1E8]">2026</dd>
          </div>
        </dl>
      </header>

      {/* Methodology Sections */}
      <div className="space-y-10 text-sm leading-relaxed text-[#E8E1D3]/90">
        <section className="space-y-2.5">
          <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8]">
            01. Project Objective
          </h2>
          <p>
            Raw book ratings on the web can easily mislead readers: a newly listed book with two
            5-star reviews can appear higher than an enduring work rated 4.6 across thousands of
            readers. This project addresses that gap by combining authentic bibliographic API data,
            structured SQLite storage, interactive visual analytics, and Bayesian confidence-aware
            ranking into a transparent academic platform.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8]">
            02. Verified Dataset Sources
          </h2>
          <p>
            Every book record in this application originates from genuine external public book
            catalogs with explicit source attribution attached to every rating:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[#A5ADBC]">
            <li>
              <strong className="text-[#F5F1E8]">Google Books API (Primary):</strong> Official
              Volumes endpoint (<code className="font-mono text-xs text-[#C6A96B]">books/v1/volumes</code>)
              providing <code className="font-mono text-xs">volumeInfo.averageRating</code>,{' '}
              <code className="font-mono text-xs">volumeInfo.ratingsCount</code>, ISBN-13/10,
              publisher, categories, page counts, and preview links. Supports optional server-side{' '}
              <code className="font-mono text-xs">GOOGLE_BOOKS_API_KEY</code> configuration for
              dedicated daily quota.
            </li>
            <li>
              <strong className="text-[#F5F1E8]">Open Library API (Internet Archive):</strong>{' '}
              Official Search &amp; Works APIs providing authentic user ratings, total rating
              counts, median page counts, ISBN identifiers, and genuine 1-to-5 star rating
              distributions (<code className="font-mono text-xs">ratings_count_1..5</code>).
            </li>
          </ul>
          <p className="text-xs text-[#A5ADBC]">
            Books from distinct sources or distinct edition IDs are stored under separate keys and
            never silently merged by title similarity. Missing ratings remain strictly{' '}
            <code className="font-mono">null</code> and render as &ldquo;Not Rated&rdquo;—never
            replaced with 0, 3, 4, or 5.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8]">
            03. Data Collection &amp; Caching Methodology
          </h2>
          <p>
            All API responses are proxied through our Node.js Express server and cached in a local
            SQLite database (<code className="font-mono text-xs text-[#C6A96B]">data/book_analytics.sqlite</code>)
            using parameterized prepared statements. Caching avoids redundant remote calls,
            protects against API rate limits, preserves fetch timestamps, and enables instant
            multi-facet SQL filtering across genres, languages, publication years, and rating
            thresholds.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8]">
            04. Rating Calculation Methodology
          </h2>
          <p>
            To prevent statistical confusion, the analytics engine strictly separates two distinct
            averages:
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-4">
              <p className="font-medium text-[#F5F1E8]">Average of Book Ratings (Unweighted)</p>
              <p className="mt-2 font-mono text-xs text-[#A7BFA3]">
                Mean = Sum(R_i) / N_rated
              </p>
              <p className="mt-2 text-xs text-[#A5ADBC]">
                Treats every rated book equally regardless of whether it received 5 ratings or
                5,000 ratings.
              </p>
            </div>
            <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-4">
              <p className="font-medium text-[#F5F1E8]">Weighted Average Across All Ratings</p>
              <p className="mt-2 font-mono text-xs text-[#C6A96B]">
                Weighted Avg = Sum(R_i × v_i) / Sum(v_i)
              </p>
              <p className="mt-2 text-xs text-[#A5ADBC]">
                Weights each book&apos;s average rating by its genuine number of user ratings,
                reflecting aggregate reader sentiment.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8]">
            05. Statistical Analysis &amp; Bayesian Ranking
          </h2>
          <p>
            Our recommendation engine applies a Bayesian weighted average formula so books with
            sparse rating counts shrink smoothly toward the eligible dataset mean{' '}
            <code className="font-mono text-xs text-[#C6A96B]">C</code>:
          </p>
          <div className="rounded-md border border-[#C6A96B]/25 bg-[#111827] px-4 py-3 font-mono text-xs text-[#C6A96B]">
            Weighted Rating = (v / (v + m)) × R + (m / (v + m)) × C
          </div>
          <p className="text-xs text-[#A5ADBC]">
            Users can interactively adjust the confidence threshold{' '}
            <code className="font-mono">m</code> (default: 50 ratings) on the Recommendations page.
            Genre metrics normalize source subject tags into a single canonical primary genre per
            book so multi-tagged books are never double-counted in overall weighted totals.
            Publication-year trend calculations extract verified 4-digit years strictly between 1450
            and 2026 and exclude incomplete dates without estimation.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8]">
            06. Known Limitations
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-[#A5ADBC]">
            <li>
              <strong className="text-[#F5F1E8]">API Quota &amp; Coverage:</strong> Anonymous calls
              to Google Books API from shared cloud IP addresses may hit daily HTTP 429 rate limits
              unless a dedicated <code className="font-mono text-xs">GOOGLE_BOOKS_API_KEY</code> is
              supplied. In such cases, the app surfaces the exact HTTP error transparently rather
              than substituting synthetic data.
            </li>
            <li>
              <strong className="text-[#F5F1E8]">Star Breakdown Availability:</strong> Google Books
              API does not expose individual 1–5 star histogram counts; when unavailable, the Book
              Details view explicitly reports that rating distribution data is not available.
            </li>
            <li>
              <strong className="text-[#F5F1E8]">Self-Selection Bias:</strong> Public user
              ratings naturally exhibit positive skew and self-selection bias across platforms;
              ratings from different APIs should be interpreted alongside their source attribution.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
