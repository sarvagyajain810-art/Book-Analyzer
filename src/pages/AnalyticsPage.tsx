import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type FacetsResponse } from '../lib/api.ts';
import type { AnalyticsPayload } from '../../shared/types.ts';
import { MetricTooltip } from '../components/MetricTooltip.tsx';

interface AnalyticsPageProps {
  onSelectBook: (bookId: string) => void;
  onNavigateReport: (filters: {
    source: string;
    genre: string;
    yearMin: number | null;
    yearMax: number | null;
    minRatingCount: number;
  }) => void;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0B1020',
  border: '1px solid rgba(245,241,232,0.16)',
  borderRadius: '6px',
  color: '#F5F1E8',
  fontSize: '12px',
};

export function AnalyticsPage({ onSelectBook, onNavigateReport }: AnalyticsPageProps) {
  const [source, setSource] = useState('all');
  const [genre, setGenre] = useState('all');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [minRatingCount, setMinRatingCount] = useState(50);
  const [metricMode, setMetricMode] = useState<'weighted' | 'unweighted'>('weighted');
  const [comparedGenres, setComparedGenres] = useState<string[]>([]);

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalytics({
        source: source !== 'all' ? source : undefined,
        genre: genre !== 'all' ? genre : undefined,
        yearMin: yearMin ? Number(yearMin) : null,
        yearMax: yearMax ? Number(yearMax) : null,
        minRatingCount,
      });
      setData(res);
      setFacets(res.facets);
      setComparedGenres((prev) => {
        if (prev.length > 0) return prev;
        return res.genreMetrics.slice(0, 4).map((g) => g.genre);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to compute analytics.');
    } finally {
      setLoading(false);
    }
  }, [source, genre, yearMin, yearMax, minRatingCount]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const toggleComparedGenre = (g: string) => {
    setComparedGenres((prev) => {
      if (prev.includes(g)) {
        return prev.length > 1 ? prev.filter((item) => item !== g) : prev;
      }
      if (prev.length >= 5) return prev;
      return [...prev, g];
    });
  };

  const resetFilters = () => {
    setSource('all');
    setGenre('all');
    setYearMin('');
    setYearMax('');
    setMinRatingCount(50);
  };

  const genreChartData = useMemo(() => {
    if (!data) return [];
    return data.genreMetrics
      .filter((g) => g.ratedBookCount > 0)
      .map((g) => ({
        genre: g.genre,
        shortGenre: g.genre.length > 18 ? `${g.genre.slice(0, 17)}…` : g.genre,
        rating:
          metricMode === 'weighted'
            ? Number((g.weightedAvgRating ?? 0).toFixed(3))
            : Number((g.unweightedAvgRating ?? 0).toFixed(3)),
        weightedAvg: g.weightedAvgRating !== null ? Number(g.weightedAvgRating.toFixed(3)) : null,
        unweightedAvg:
          g.unweightedAvgRating !== null ? Number(g.unweightedAvgRating.toFixed(3)) : null,
        totalRatings: g.totalRatings,
        bookCount: g.bookCount,
        ratedBookCount: g.ratedBookCount,
      }));
  }, [data, metricMode]);

  const comparisonData = useMemo(() => {
    if (!data) return [];
    return data.genreMetrics.filter((g) => comparedGenres.includes(g.genre));
  }, [data, comparedGenres]);

  const yearChartData = useMemo(() => {
    if (!data) return [];
    return data.yearTrends
      .filter((y) => y.ratedBookCount > 0)
      .map((y) => ({
        year: y.year,
        rating:
          metricMode === 'weighted'
            ? Number((y.weightedAvgRating ?? 0).toFixed(3))
            : Number((y.unweightedAvgRating ?? 0).toFixed(3)),
        weightedAvg: y.weightedAvgRating !== null ? Number(y.weightedAvgRating.toFixed(3)) : null,
        unweightedAvg:
          y.unweightedAvgRating !== null ? Number(y.unweightedAvgRating.toFixed(3)) : null,
        bookCount: y.bookCount,
        totalRatings: y.totalRatings,
      }));
  }, [data, metricMode]);

  const mostRatedChartData = useMemo(() => {
    if (!data) return [];
    return data.mostRatedBooks.slice(0, 8).map((b) => ({
      id: b.id,
      title: b.title.length > 26 ? `${b.title.slice(0, 25)}…` : b.title,
      fullTitle: b.title,
      ratingsCount: b.ratingsCount ?? 0,
      averageRating: b.averageRating ?? 0,
      source: b.dataSource,
    }));
  }, [data]);

  const highestRatedChartData = useMemo(() => {
    if (!data) return [];
    return data.highestRatedBooks.slice(0, 8).map((b) => ({
      id: b.id,
      title: b.title.length > 26 ? `${b.title.slice(0, 25)}…` : b.title,
      fullTitle: b.title,
      averageRating: Number((b.averageRating ?? 0).toFixed(3)),
      bayesianScore: b.bayesianScore !== null ? Number(b.bayesianScore.toFixed(3)) : null,
      ratingsCount: b.ratingsCount ?? 0,
      source: b.dataSource,
    }));
  }, [data]);

  const summary = data?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#F5F1E8]/10 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F5F1E8] sm:text-4xl">
            Data Analytics Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A5ADBC]">
            Interactive statistical exploration across genres, publication years, and rating
            confidence thresholds. All calculations update live from the verified dataset.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onNavigateReport({
              source,
              genre,
              yearMin: yearMin ? Number(yearMin) : null,
              yearMax: yearMax ? Number(yearMax) : null,
              minRatingCount,
            })
          }
          className="h-10 rounded-md bg-[#C6A96B] px-4 text-xs font-semibold text-[#0B1020] transition-colors hover:bg-[#D5BD88] whitespace-nowrap"
        >
          Export Filtered Report
        </button>
      </div>

      {/* Dynamic Filter & Metric Toggle Bar */}
      <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F5F1E8]/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#E8E1D3]">Rating Aggregation Metric:</span>
            <div
              role="group"
              aria-label="Rating aggregation metric"
              className="inline-flex rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] p-0.5"
            >
              <button
                type="button"
                onClick={() => setMetricMode('weighted')}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  metricMode === 'weighted'
                    ? 'bg-[#C6A96B] text-[#0B1020]'
                    : 'text-[#A5ADBC] hover:text-[#F5F1E8]'
                }`}
              >
                Weighted Average
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('unweighted')}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  metricMode === 'unweighted'
                    ? 'bg-[#C6A96B] text-[#0B1020]'
                    : 'text-[#A5ADBC] hover:text-[#F5F1E8]'
                }`}
              >
                Unweighted Mean
              </button>
            </div>
            <MetricTooltip title="Unweighted Mean vs. Weighted Average">
              <p>
                <strong className="text-[#F5F1E8]">Weighted Average</strong> = Sum(Book Average
                Rating × Ratings Count) / Total Ratings. Reflects the true average across all user
                votes.
              </p>
              <p>
                <strong className="text-[#F5F1E8]">Unweighted Mean</strong> = Sum(Book Average
                Ratings) / Number of Rated Books. Treats a book with 5 ratings equally to one with
                5,000 ratings.
              </p>
            </MetricTooltip>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C6A96B] hover:text-[#D5BD88]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Data Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="all">All Verified Sources</option>
              <option value="Open Library API">Open Library API</option>
              <option value="Google Books API">Google Books API</option>
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Genre Scope</span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="all">All Genres</option>
              {(facets?.genres ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Year From</span>
            <input
              type="number"
              min={1450}
              max={2026}
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
              placeholder={facets?.minYear ? String(facets.minYear) : '1900'}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 font-mono text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Year To</span>
            <input
              type="number"
              min={1450}
              max={2026}
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
              placeholder={facets?.maxYear ? String(facets.maxYear) : '2026'}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 font-mono text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Min Ratings (Top Books)</span>
            <select
              value={minRatingCount}
              onChange={(e) => setMinRatingCount(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 font-mono text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value={10}>10+ ratings</option>
              <option value={25}>25+ ratings</option>
              <option value={50}>50+ ratings</option>
              <option value={100}>100+ ratings</option>
              <option value={200}>200+ ratings</option>
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-950/25 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Explicit Side-by-Side Unweighted vs Weighted Summary KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
          <p className="text-xs text-[#A5ADBC]">Books in Active Selection</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#F5F1E8]">
            {loading ? '—' : (summary?.totalBooks ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#A5ADBC]">
            {summary
              ? `${summary.ratedBooks} rated (${summary.totalBooks > 0 ? ((summary.ratedBooks / summary.totalBooks) * 100).toFixed(1) : 0}% coverage)`
              : 'Loading…'}
          </p>
        </div>

        <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
          <p className="text-xs text-[#A5ADBC]">Total Ratings Analyzed</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#C6A96B]">
            {loading ? '—' : (summary?.totalRatings ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#A5ADBC]">
            Across {summary?.genreCount ?? 0} normalized genres
          </p>
        </div>

        <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
          <div className="flex items-center gap-1">
            <p className="text-xs text-[#A5ADBC]">Weighted Average Rating</p>
            <MetricTooltip title="Weighted Average Formula">
              <p className="font-mono text-[11px] text-[#C6A96B]">
                Sum(AvgRating_i × Count_i) / Sum(Count_i)
              </p>
              <p>Each individual user rating carries equal statistical weight.</p>
            </MetricTooltip>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#A7BFA3]">
            {loading
              ? '—'
              : summary?.weightedAverageRating !== null &&
                  summary?.weightedAverageRating !== undefined
                ? `${summary.weightedAverageRating.toFixed(3)} / 5`
                : 'Not Rated'}
          </p>
          <p className="mt-1 text-xs text-[#A5ADBC]">Weighted across all individual ratings</p>
        </div>

        <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-5">
          <div className="flex items-center gap-1">
            <p className="text-xs text-[#A5ADBC]">Average of Book Averages</p>
            <MetricTooltip title="Unweighted Mean Formula">
              <p className="font-mono text-[11px] text-[#C6A96B]">
                Sum(AvgRating_i) / Count(Rated Books)
              </p>
              <p>Simple arithmetic mean where each rated book counts once equally.</p>
            </MetricTooltip>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#F5F1E8]">
            {loading
              ? '—'
              : summary?.unweightedAverageRating !== null &&
                  summary?.unweightedAverageRating !== undefined
                ? `${summary.unweightedAverageRating.toFixed(3)} / 5`
                : 'Not Rated'}
          </p>
          <p className="mt-1 text-xs text-[#A5ADBC]">Unweighted arithmetic mean per book</p>
        </div>
      </section>

      {/* Charts Grid: 1 & 2 (Genre Ratings & Genre Volume) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Chart 1: Average Rating by Genre */}
        <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              1. Average Rating by Genre
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Showing{' '}
              <strong className="text-[#E8E1D3]">
                {metricMode === 'weighted'
                  ? 'Weighted Average (by rating count)'
                  : 'Unweighted Mean of Book Averages'}
              </strong>{' '}
              using each book&apos;s single primary normalized genre (zero double-counting).
            </p>
          </div>
          <div className="h-80 w-full">
            {genreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={genreChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fill: '#A5ADBC', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortGenre"
                    width={126}
                    tick={{ fill: '#E8E1D3', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: unknown) => [`${Number(val).toFixed(3)} / 5`, metricMode === 'weighted' ? 'Weighted Avg' : 'Unweighted Avg']}
                  />
                  <Bar dataKey="rating" fill="#C6A96B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState loading={loading} />
            )}
          </div>
        </section>

        {/* Chart 2: Rating Count by Genre */}
        <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              2. Rating Count by Genre
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Total cumulative user ratings collected across books assigned to each primary genre.
            </p>
          </div>
          <div className="h-80 w-full">
            {genreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={genreChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#A5ADBC', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortGenre"
                    width={126}
                    tick={{ fill: '#E8E1D3', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: unknown) => [Number(val).toLocaleString(), 'Total Ratings']}
                  />
                  <Bar dataKey="totalRatings" fill="#A7BFA3" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState loading={loading} />
            )}
          </div>
        </section>
      </div>

      {/* Chart 3: Average Rating by Publication Year */}
      <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              3. Average Rating by Publication Year
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Comparing weighted vs. unweighted rating trajectories across verified publication
              years.
              {summary && summary.booksExcludedFromYearAnalysis > 0 && (
                <span>
                  {' '}
                  ({summary.booksExcludedFromYearAnalysis} books lacking a valid publication year
                  excluded without guessing.)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="h-80 w-full">
          {yearChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearChartData} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#A5ADBC', fontSize: 11 }}
                />
                <YAxis
                  domain={[2, 5]}
                  tick={{ fill: '#A5ADBC', fontSize: 11 }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#E8E1D3' }} />
                <Line
                  type="monotone"
                  dataKey="weightedAvg"
                  name="Weighted Average"
                  stroke="#C6A96B"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#C6A96B' }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="unweightedAvg"
                  name="Unweighted Mean"
                  stroke="#A7BFA3"
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState loading={loading} />
          )}
        </div>
      </section>

      {/* Charts 4 & 5: Most Rated Books & Highest Rated Books (Thresholded) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Chart 4: Most Rated Books */}
        <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              4. Most Rated Books
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Highest total user rating volume. Click any bar to inspect the edition details.
            </p>
          </div>
          <div className="h-80 w-full">
            {mostRatedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mostRatedChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis type="number" tick={{ fill: '#A5ADBC', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={155}
                    tick={{ fill: '#E8E1D3', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: unknown, _name: unknown, props: { payload?: { fullTitle?: string; averageRating?: number } }) => [
                      `${Number(val).toLocaleString()} ratings (Avg: ${props?.payload?.averageRating?.toFixed(2) ?? 'N/A'})`,
                      props?.payload?.fullTitle ?? 'Book',
                    ]}
                  />
                  <Bar
                    dataKey="ratingsCount"
                    fill="#A7BFA3"
                    radius={[0, 4, 4, 0]}
                    className="cursor-pointer"
                    onClick={(entry) => {
                      if (entry && typeof entry.id === 'string') onSelectBook(entry.id);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState loading={loading} />
            )}
          </div>
        </section>

        {/* Chart 5: Highest Rated Books (Thresholded) */}
        <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              5. Highest Rated Books (≥ {minRatingCount} Ratings)
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Filtered by minimum rating count threshold to prevent low-sample outliers from
              dominating. Click any bar to inspect details.
            </p>
          </div>
          <div className="h-80 w-full">
            {highestRatedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={highestRatedChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis
                    type="number"
                    domain={[3, 5]}
                    tick={{ fill: '#A5ADBC', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={155}
                    tick={{ fill: '#E8E1D3', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: unknown, _name: unknown, props: { payload?: { fullTitle?: string; ratingsCount?: number; bayesianScore?: number | null } }) => [
                      `${Number(val).toFixed(2)} / 5 (${props?.payload?.ratingsCount?.toLocaleString() ?? 0} ratings · Bayesian ${props?.payload?.bayesianScore?.toFixed(3) ?? 'N/A'})`,
                      props?.payload?.fullTitle ?? 'Book',
                    ]}
                  />
                  <Bar
                    dataKey="averageRating"
                    fill="#C6A96B"
                    radius={[0, 4, 4, 0]}
                    className="cursor-pointer"
                    onClick={(entry) => {
                      if (entry && typeof entry.id === 'string') onSelectBook(entry.id);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                loading={loading}
                message={`No books in the current filter scope meet the >= ${minRatingCount} ratings threshold. Lower the threshold above to inspect smaller-sample titles.`}
              />
            )}
          </div>
        </section>
      </div>

      {/* Charts 6 & 8: Rating Distribution Histogram + Publication Year Volume/Rating Trends */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Chart 6: Rating Distribution */}
        <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              6. Rating Distribution Across Books
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Frequency distribution of authentic average book ratings across rating brackets.
            </p>
          </div>
          <div className="h-72 w-full">
            {data && data.ratingDistribution.some((d) => d.bookCount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.ratingDistribution}
                  margin={{ top: 10, right: 16, left: -10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis dataKey="range" tick={{ fill: '#A5ADBC', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#A5ADBC', fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="bookCount" name="Books" fill="#C6A96B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState loading={loading} />
            )}
          </div>
        </section>

        {/* Chart 8: Publication Year Trends (Volume & Rating Composed) */}
        <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              8. Publication Year Trends (Volume vs. Rating)
            </h2>
            <p className="mt-1 text-xs text-[#A5ADBC]">
              Adjust the Year From / Year To controls above to zoom into specific decades and
              compare rating volume against average score.
            </p>
          </div>
          <div className="h-72 w-full">
            {yearChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={yearChartData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis dataKey="year" tick={{ fill: '#A5ADBC', fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    allowDecimals={false}
                    tick={{ fill: '#A5ADBC', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[2, 5]}
                    tick={{ fill: '#C6A96B', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalRatings"
                    name="Ratings Collected"
                    fill="rgba(167,191,163,0.22)"
                    stroke="#A7BFA3"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rating"
                    name={metricMode === 'weighted' ? 'Weighted Avg' : 'Unweighted Avg'}
                    stroke="#C6A96B"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState loading={loading} />
            )}
          </div>
        </section>
      </div>

      {/* Chart 7: Interactive Genre Comparison Tool */}
      <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
            7. Interactive Genre Comparison
          </h2>
          <p className="text-xs text-[#A5ADBC]">
            Select up to 5 genres below to compare weighted vs. unweighted rating performance and
            reader engagement side by side.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {(data?.genreMetrics ?? []).map((g) => {
              const selected = comparedGenres.includes(g.genre);
              return (
                <button
                  key={g.genre}
                  type="button"
                  onClick={() => toggleComparedGenre(g.genre)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    selected
                      ? 'border-[#C6A96B] bg-[#C6A96B]/15 text-[#F5F1E8]'
                      : 'border-[#F5F1E8]/15 bg-[#0B1020] text-[#A5ADBC] hover:border-[#F5F1E8]/30 hover:text-[#F5F1E8]'
                  }`}
                >
                  {g.genre}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-72 lg:col-span-6">
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData.map((g) => ({
                    genre: g.genre.length > 14 ? `${g.genre.slice(0, 13)}…` : g.genre,
                    weighted: g.weightedAvgRating ? Number(g.weightedAvgRating.toFixed(3)) : 0,
                    unweighted: g.unweightedAvgRating ? Number(g.unweightedAvgRating.toFixed(3)) : 0,
                  }))}
                  margin={{ top: 10, right: 12, left: -12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                  <XAxis dataKey="genre" tick={{ fill: '#E8E1D3', fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fill: '#A5ADBC', fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="weighted" name="Weighted Avg" fill="#C6A96B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unweighted" name="Unweighted Avg" fill="#A7BFA3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState loading={loading} />
            )}
          </div>

          <div className="overflow-x-auto lg:col-span-6">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#F5F1E8]/15 text-[#A5ADBC]">
                  <th className="py-2.5 pr-3 font-medium">Genre</th>
                  <th className="py-2.5 px-2 text-right font-medium">Books</th>
                  <th className="py-2.5 px-2 text-right font-medium">Ratings</th>
                  <th className="py-2.5 px-2 text-right font-medium">Weighted</th>
                  <th className="py-2.5 pl-2 text-right font-medium">Unweighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F1E8]/10">
                {comparisonData.map((g) => (
                  <tr key={g.genre} className="hover:bg-[#172033]/50">
                    <td className="py-2.5 pr-3 font-medium text-[#F5F1E8]">{g.genre}</td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#E8E1D3]">
                      {g.bookCount}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#E8E1D3]">
                      {g.totalRatings.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#C6A96B]">
                      {g.weightedAvgRating !== null ? g.weightedAvgRating.toFixed(2) : 'Not Rated'}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-[#A7BFA3]">
                      {g.unweightedAvgRating !== null
                        ? g.unweightedAvgRating.toFixed(2)
                        : 'Not Rated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyChartState({ loading, message }: { loading: boolean; message?: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-[#F5F1E8]/5 bg-[#0B1020]/50 px-6 text-center text-xs text-[#A5ADBC]">
      {loading ? 'Calculating chart metrics…' : message ?? 'No matching rated data for the active filters.'}
    </div>
  );
}
