import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api.ts';
import type {
  AnalyticsPayload,
  BookWithScore,
  ProviderStatus,
} from '../../shared/types.ts';
import { BookCard } from '../components/BookCard.tsx';
import { MetricTooltip } from '../components/MetricTooltip.tsx';
import { SearchBar } from '../components/SearchBar.tsx';

interface HomePageProps {
  onNavigateExplore: (opts?: { q?: string; genre?: string; searchType?: string }) => void;
  onNavigateAnalytics: () => void;
  onNavigateRecommendations: () => void;
  onSelectBook: (bookId: string) => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export function HomePage({
  onNavigateExplore,
  onNavigateAnalytics,
  onNavigateRecommendations,
  onSelectBook,
  onNotify,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [featured, setFeatured] = useState<BookWithScore[]>([]);
  const [recentBooks, setRecentBooks] = useState<BookWithScore[]>([]);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [statusRes, analyticsRes, recRes, recentRes] = await Promise.all([
        api.getStatus(),
        api.getAnalytics({ minRatingCount: 50 }),
        api.getRecommendations({ m: 50 }),
        api.getBooks({ sort: 'recent', limit: 4, page: 1 }),
      ]);
      setStatus(statusRes);
      setAnalytics(analyticsRes);
      setFeatured(recRes.categories.highlyRated.slice(0, 4));
      setRecentBooks(recentRes.items.slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Poll briefly if initial live corpus seeding is still running
  useEffect(() => {
    if (!status?.isSeeding && (status?.totalCachedBooks ?? 0) > 0) return;
    if (!status) return;
    const timer = window.setTimeout(() => {
      loadDashboard(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleRefreshCorpus = async () => {
    setCollecting(true);
    try {
      const res = await api.triggerCollect();
      await loadDashboard(true);
      onNotify(
        'success',
        `Synchronized live catalog: ${res.totalCachedBooks.toLocaleString()} books stored in SQLite.`
      );
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Live catalog refresh failed.');
    } finally {
      setCollecting(false);
    }
  };

  const summary = analytics?.summary;
  const topGenres = analytics?.genreMetrics.slice(0, 6) ?? [];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section: 2-column editorial split with items-stretch */}
      <section className="border-b border-[#F5F1E8]/10 bg-[#0B1020]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="flex flex-col justify-between lg:col-span-7">
              <div className="space-y-6">
                <p className="text-xs font-medium tracking-wide text-[#C6A96B]">
                  Data Science Mini Project · Empirical Book Analytics
                </p>

                <h1 className="font-serif text-4xl font-semibold leading-[1.12] tracking-tight text-[#F5F1E8] sm:text-5xl lg:text-[3.35rem]">
                  Discover Books. Understand Ratings.
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-[#A5ADBC] sm:text-lg">
                  Explore highly rated books and uncover reading trends through real-world rating
                  data.
                </p>

                <div className="max-w-xl pt-2">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSubmit={(q, searchType) => onNavigateExplore({ q, searchType })}
                    onSelectBook={onSelectBook}
                    placeholder="Search real books by title, author, ISBN, or genre…"
                    submitLabel="Search Catalog"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateExplore()}
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-[#C6A96B] px-5 text-sm font-semibold text-[#0B1020] transition-colors hover:bg-[#D5BD88] whitespace-nowrap"
                  >
                    Explore Books
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateAnalytics}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-[#F5F1E8]/20 bg-transparent px-5 text-sm font-medium text-[#F5F1E8] transition-colors hover:border-[#C6A96B]/60 hover:text-[#C6A96B] whitespace-nowrap"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#F5F1E8]/10 pt-5 text-xs text-[#A5ADBC]">
                <span>Primary APIs: Google Books &amp; Open Library</span>
                <span aria-hidden="true">·</span>
                <span>Bayesian Confidence-Aware Ranking</span>
                <span aria-hidden="true">·</span>
                <span>Zero Fabricated Ratings</span>
              </div>
            </div>

            {/* Right Visual Column */}
            <div className="lg:col-span-5">
              <div className="relative h-72 w-full overflow-hidden rounded-lg border border-[#F5F1E8]/10 bg-[#111827] sm:h-80 lg:h-full lg:min-h-[380px]">
                <img
                  src="/src/assets/images/hero_editorial_library_1795689897471.jpg"
                  alt="Classical research library reading room with dark navy shelves and clothbound volumes"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020]/90 via-[#0B1020]/25 to-transparent" />
                <div className="absolute right-0 bottom-0 left-0 p-5">
                  <p className="font-serif text-base font-medium text-[#F5F1E8]">
                    Empirical Reading Intelligence
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#E8E1D3]/85">
                    Every chart, average, and recommendation is calculated dynamically from real
                    catalog metadata cached in SQLite.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Dashboard Statistics Strip (Full-Width 4-Column Row) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="rounded-md border border-red-300/30 px-3 py-1.5 text-xs font-medium hover:bg-red-900/40"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
            <p className="text-xs text-[#A5ADBC]">Total Books Analyzed</p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#F5F1E8]">
              {loading ? '—' : (summary?.totalBooks ?? 0).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-[#A5ADBC]">
              {loading
                ? 'Loading corpus…'
                : `${summary?.ratedBooks.toLocaleString() ?? 0} rated · ${summary?.unratedBooks.toLocaleString() ?? 0} not rated`}
            </p>
          </div>

          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
            <p className="text-xs text-[#A5ADBC]">Total Ratings Collected</p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#C6A96B]">
              {loading ? '—' : (summary?.totalRatings ?? 0).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-[#A5ADBC]">
              Genuine reader ratings across verified sources
            </p>
          </div>

          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
            <div className="flex items-center gap-1">
              <p className="text-xs text-[#A5ADBC]">Average Book Rating</p>
              <MetricTooltip title="Unweighted vs. Weighted Average">
                <p>
                  <strong className="text-[#F5F1E8]">Weighted Average</strong> weights each book by
                  its rating count: Sum(R × v) / Sum(v).
                </p>
                <p>
                  <strong className="text-[#F5F1E8]">Unweighted Mean</strong> averages each rated
                  book equally regardless of rating volume.
                </p>
              </MetricTooltip>
            </div>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#A7BFA3]">
              {loading
                ? '—'
                : summary?.weightedAverageRating !== null &&
                    summary?.weightedAverageRating !== undefined
                  ? `${summary.weightedAverageRating.toFixed(2)} / 5`
                  : 'Not Rated'}
            </p>
            <p className="mt-2 font-mono text-xs tabular-nums text-[#A5ADBC]">
              {loading
                ? 'Calculating…'
                : `Weighted · Unweighted mean: ${summary?.unweightedAverageRating !== null && summary?.unweightedAverageRating !== undefined ? summary.unweightedAverageRating.toFixed(2) : 'N/A'}`}
            </p>
          </div>

          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
            <p className="text-xs text-[#A5ADBC]">Number of Genres</p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#F5F1E8]">
              {loading ? '—' : (summary?.genreCount ?? 0).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-[#A5ADBC]">
              Normalized primary genres without double-counting
            </p>
          </div>
        </div>

        {status?.isSeeding && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#C6A96B]/30 bg-[#111827] px-4 py-3 text-xs text-[#E8E1D3]">
            <span>
              Collecting live multi-genre book catalog from public book APIs into SQLite…
            </span>
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#C6A96B]" />
          </div>
        )}
      </section>

      {/* Featured Highly Rated Books (Confidence-Adjusted) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#F5F1E8]/10 pb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8] sm:text-3xl">
              Featured Highly Rated Books
            </h2>
            <p className="mt-1 text-sm text-[#A5ADBC]">
              Ranked with Bayesian confidence weighting (minimum 50 ratings threshold) so small
              samples do not skew top results.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateRecommendations}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C6A96B] transition-colors hover:text-[#D5BD88] whitespace-nowrap"
          >
            All Recommendations
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[380px] animate-pulse rounded-lg border border-[#F5F1E8]/10 bg-[#172033]/60"
              />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-8 text-center">
            <p className="text-sm text-[#A5ADBC]">
              No rated books available in the local cache yet.
            </p>
            <button
              type="button"
              onClick={handleRefreshCorpus}
              disabled={collecting}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#C6A96B] px-4 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#D5BD88] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${collecting ? 'animate-spin' : ''}`} />
              Fetch Live Book Dataset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                showBayesianScore
                onSelect={onSelectBook}
              />
            ))}
          </div>
        )}
      </section>

      {/* Popular Genres + Rating Distribution Overview (Balanced 2-Column Editorial Split) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Popular Genres */}
          <div className="flex flex-col rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6 lg:col-span-6">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">Popular Genres</h2>
                <p className="mt-1 text-xs text-[#A5ADBC]">
                  Ordered by total verified ratings collected. Select any genre to explore titles.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateAnalytics}
                className="text-xs font-medium text-[#C6A96B] hover:text-[#D5BD88] whitespace-nowrap"
              >
                Compare Genres
              </button>
            </div>

            <div className="divide-y divide-[#F5F1E8]/10">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse py-3" />
                  ))
                : topGenres.map((g) => (
                    <button
                      key={g.genre}
                      type="button"
                      onClick={() => onNavigateExplore({ genre: g.genre })}
                      className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors hover:bg-[#172033]/60 px-2 -mx-2 rounded"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#F5F1E8]">{g.genre}</p>
                        <p className="mt-0.5 text-xs text-[#A5ADBC]">
                          {g.bookCount} books · {g.totalRatings.toLocaleString()} ratings
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold tabular-nums text-[#C6A96B]">
                          {g.weightedAvgRating !== null
                            ? `${g.weightedAvgRating.toFixed(2)} / 5`
                            : 'Not Rated'}
                        </p>
                        <p className="text-[11px] text-[#A5ADBC]">Weighted avg</p>
                      </div>
                    </button>
                  ))}
            </div>
          </div>

          {/* Rating Distribution Overview */}
          <div className="flex flex-col rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6 lg:col-span-6">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
                  Rating Distribution Overview
                </h2>
                <p className="mt-1 text-xs text-[#A5ADBC]">
                  Number of analyzed books falling within each average rating interval (1.0–5.0).
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateAnalytics}
                className="text-xs font-medium text-[#C6A96B] hover:text-[#D5BD88] whitespace-nowrap"
              >
                Full Dashboard
              </button>
            </div>

            <div className="h-72 w-full flex-1">
              {analytics && analytics.ratingDistribution.some((b) => b.bookCount > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.ratingDistribution}
                    margin={{ top: 10, right: 12, left: -12, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: '#A5ADBC', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(245,241,232,0.15)' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#A5ADBC', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(245,241,232,0.15)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(198,169,107,0.08)' }}
                      contentStyle={{
                        backgroundColor: '#0B1020',
                        border: '1px solid rgba(245,241,232,0.15)',
                        borderRadius: '6px',
                        color: '#F5F1E8',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="bookCount"
                      name="Books"
                      fill="#C6A96B"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#A5ADBC]">
                  {loading ? 'Loading rating distribution…' : 'No rated books available to plot.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recently Discovered Books */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#F5F1E8]/10 pb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#F5F1E8] sm:text-3xl">
              Recently Discovered Books
            </h2>
            <p className="mt-1 text-sm text-[#A5ADBC]">
              Most recently fetched volumes stored in the local structured catalog.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshCorpus}
              disabled={collecting}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#F5F1E8]/15 px-3 py-1.5 text-xs font-medium text-[#E8E1D3] transition-colors hover:border-[#C6A96B]/50 hover:text-[#C6A96B] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${collecting ? 'animate-spin' : ''}`} />
              {collecting ? 'Syncing…' : 'Sync Live APIs'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateExplore()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C6A96B] hover:text-[#D5BD88] whitespace-nowrap"
            >
              Browse All
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recentBooks.map((book) => (
            <BookCard key={book.id} book={book} onSelect={onSelectBook} />
          ))}
        </div>
      </section>
    </div>
  );
}
