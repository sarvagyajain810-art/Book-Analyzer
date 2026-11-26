import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { api, type FacetsResponse } from '../lib/api.ts';
import { downloadReportCsv, downloadReportPdf } from '../lib/exportUtils.ts';
import type { ReportPayload } from '../../shared/types.ts';

interface ReportPageProps {
  initialFilters?: {
    source?: string;
    genre?: string;
    yearMin?: number | null;
    yearMax?: number | null;
    minRatingCount?: number;
  };
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export function ReportPage({ initialFilters, onNotify }: ReportPageProps) {
  const [source, setSource] = useState(initialFilters?.source ?? 'all');
  const [genre, setGenre] = useState(initialFilters?.genre ?? 'all');
  const [yearMin, setYearMin] = useState(
    initialFilters?.yearMin ? String(initialFilters.yearMin) : ''
  );
  const [yearMax, setYearMax] = useState(
    initialFilters?.yearMax ? String(initialFilters.yearMax) : ''
  );
  const [minRatingCount, setMinRatingCount] = useState(initialFilters?.minRatingCount ?? 50);

  const [report, setReport] = useState<ReportPayload | null>(null);
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rep, booksRes] = await Promise.all([
        api.getReport({
          source: source !== 'all' ? source : undefined,
          genre: genre !== 'all' ? genre : undefined,
          yearMin: yearMin ? Number(yearMin) : null,
          yearMax: yearMax ? Number(yearMax) : null,
          minRatingCount,
        }),
        api.getBooks({ limit: 1, page: 1 }),
      ]);
      setReport(rep);
      setFacets(booksRes.facets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  }, [source, genre, yearMin, yearMax, minRatingCount]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleDownloadCsv = () => {
    if (!report) return;
    try {
      downloadReportCsv(report);
      onNotify('success', 'Analytics report CSV downloaded.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'CSV export failed.');
    }
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    try {
      downloadReportPdf(report);
      onNotify('success', 'Academic PDF report downloaded.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'PDF export failed.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Controls Header (Hidden on Print) */}
      <div className="no-print space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#F5F1E8]/10 pb-5">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#F5F1E8] sm:text-4xl">
              Book Rating Analytics Report
            </h1>
            <p className="mt-1.5 text-sm text-[#A5ADBC]">
              Generated dynamically from the active dataset and filters. Export as CSV, PDF, or
              print directly for academic submission.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!report || loading}
              onClick={handleDownloadCsv}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F5F1E8]/20 bg-[#172033] px-4 text-xs font-medium text-[#F5F1E8] transition-colors hover:border-[#C6A96B]/60 hover:text-[#C6A96B] disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download CSV
            </button>

            <button
              type="button"
              disabled={!report || loading}
              onClick={handleDownloadPdf}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#C6A96B] px-4 text-xs font-semibold text-[#0B1020] transition-colors hover:bg-[#D5BD88] disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              type="button"
              disabled={!report || loading}
              onClick={handlePrint}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F5F1E8]/20 bg-transparent px-4 text-xs font-medium text-[#F5F1E8] transition-colors hover:border-[#C6A96B]/60 disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </button>
          </div>
        </div>

        {/* Report Scope Filters */}
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Data Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 text-xs text-[#F5F1E8]"
            >
              <option value="all">All Verified Sources</option>
              <option value="Open Library API">Open Library API</option>
              <option value="Google Books API">Google Books API</option>
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Genre</span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 text-xs text-[#F5F1E8]"
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
              placeholder="Any"
              className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 font-mono text-xs text-[#F5F1E8]"
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
              placeholder="Any"
              className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 font-mono text-xs text-[#F5F1E8]"
            />
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Min Ratings Threshold</span>
            <select
              value={minRatingCount}
              onChange={(e) => setMinRatingCount(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 font-mono text-xs text-[#F5F1E8]"
            >
              <option value={10}>10+ ratings</option>
              <option value={25}>25+ ratings</option>
              <option value={50}>50+ ratings</option>
              <option value={100}>100+ ratings</option>
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-950/25 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Academic Report Document Surface (Warm Ivory Paper Aesthetic) */}
      {loading || !report ? (
        <div className="h-[680px] animate-pulse rounded-lg border border-[#F5F1E8]/10 bg-[#172033]/50" />
      ) : (
        <article className="print-document rounded-lg border border-[#C6A96B]/30 bg-[#F5F1E8] p-6 text-[#111827] shadow-2xl sm:p-10">
          {/* Formal Academic Title Block */}
          <header className="border-b-2 border-[#111827]/15 pb-6">
            <p className="text-xs font-semibold tracking-wider text-[#8C6D2E]">
              DATA SCIENCE MINI PROJECT — ANALYTICS REPORT
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#0B1020] sm:text-4xl">
              {report.projectMetadata.projectName}
            </h2>
            <p className="mt-2 text-sm font-medium text-[#1F2937]">
              Developed by {report.projectMetadata.studentName}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-[#4B5563]">
              <span>Project ID: {report.projectMetadata.projectId}</span>
              <span>Section: {report.projectMetadata.section}</span>
              <span>Academic Year: {report.projectMetadata.academicYear}</span>
              <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-xs text-[#4B5563]">
              Active Filter Scope: Source = {report.appliedFilters.source} · Genre ={' '}
              {report.appliedFilters.genre} · Years ={' '}
              {report.appliedFilters.yearMin ?? 'Any'}–{report.appliedFilters.yearMax ?? 'Any'} ·
              Min Rating Count = {report.appliedFilters.minRatingCount}
            </p>
          </header>

          {/* 1. Executive Summary Grid */}
          <section className="mt-8 space-y-4">
            <h3 className="font-serif text-xl font-semibold text-[#0B1020]">
              1. Executive Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded border border-[#111827]/15 bg-white/70 p-3.5">
                <p className="text-[11px] text-[#4B5563]">Total Books Analyzed</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0B1020]">
                  {report.summary.totalBooks.toLocaleString()}
                </p>
              </div>
              <div className="rounded border border-[#111827]/15 bg-white/70 p-3.5">
                <p className="text-[11px] text-[#4B5563]">Total Ratings</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0B1020]">
                  {report.summary.totalRatings.toLocaleString()}
                </p>
              </div>
              <div className="rounded border border-[#111827]/15 bg-white/70 p-3.5">
                <p className="text-[11px] text-[#4B5563]">Weighted Avg Rating</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0B1020]">
                  {report.summary.weightedAverageRating !== null
                    ? `${report.summary.weightedAverageRating.toFixed(2)} / 5`
                    : 'Not Rated'}
                </p>
              </div>
              <div className="rounded border border-[#111827]/15 bg-white/70 p-3.5">
                <p className="text-[11px] text-[#4B5563]">Unweighted Avg Rating</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0B1020]">
                  {report.summary.unweightedAverageRating !== null
                    ? `${report.summary.unweightedAverageRating.toFixed(2)} / 5`
                    : 'Not Rated'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1 text-xs sm:grid-cols-3">
              <div className="rounded border border-[#111827]/10 bg-white/50 p-3">
                <p className="text-[#4B5563]">Most Popular Genre</p>
                <p className="mt-1 font-semibold text-[#0B1020]">
                  {report.mostPopularGenre
                    ? `${report.mostPopularGenre.genre} (${report.mostPopularGenre.totalRatings.toLocaleString()} ratings)`
                    : 'Not Available'}
                </p>
              </div>
              <div className="rounded border border-[#111827]/10 bg-white/50 p-3">
                <p className="text-[#4B5563]">Highest-Rated Genre (Weighted)</p>
                <p className="mt-1 font-semibold text-[#0B1020]">
                  {report.highestRatedGenre
                    ? `${report.highestRatedGenre.genre} (${report.highestRatedGenre.weightedAvgRating?.toFixed(2) ?? 'N/A'}/5)`
                    : 'Not Available'}
                </p>
              </div>
              <div className="rounded border border-[#111827]/10 bg-white/50 p-3">
                <p className="text-[#4B5563]">Most Rated Book</p>
                <p className="mt-1 font-semibold text-[#0B1020] line-clamp-1">
                  {report.mostRatedBook
                    ? `${report.mostRatedBook.title} (${report.mostRatedBook.ratingsCount?.toLocaleString()})`
                    : 'Not Available'}
                </p>
              </div>
            </div>
          </section>

          {/* 2. Key Empirical Observations */}
          <section className="mt-8 space-y-3">
            <h3 className="font-serif text-xl font-semibold text-[#0B1020]">
              2. Key Data-Driven Observations
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#1F2937]">
              {report.observations.map((obs, idx) => (
                <li key={idx}>{obs}</li>
              ))}
            </ul>
          </section>

          {/* 3. Genre-Wise Rating Comparison Table */}
          <section className="mt-8 space-y-3">
            <h3 className="font-serif text-xl font-semibold text-[#0B1020]">
              3. Genre-Wise Rating Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-[#111827]/20 text-[#374151]">
                    <th className="py-2 pr-3 font-semibold">Genre</th>
                    <th className="py-2 px-2 text-right font-semibold">Books</th>
                    <th className="py-2 px-2 text-right font-semibold">Rated</th>
                    <th className="py-2 px-2 text-right font-semibold">Total Ratings</th>
                    <th className="py-2 px-2 text-right font-semibold">Unweighted Avg</th>
                    <th className="py-2 pl-2 text-right font-semibold">Weighted Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111827]/10">
                  {report.genreComparison.map((g) => (
                    <tr key={g.genre}>
                      <td className="py-2 pr-3 font-medium text-[#0B1020]">{g.genre}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{g.bookCount}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {g.ratedBookCount}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {g.totalRatings.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {g.unweightedAvgRating !== null
                          ? g.unweightedAvgRating.toFixed(2)
                          : 'Not Rated'}
                      </td>
                      <td className="py-2 pl-2 text-right font-mono font-semibold tabular-nums">
                        {g.weightedAvgRating !== null
                          ? g.weightedAvgRating.toFixed(2)
                          : 'Not Rated'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Highest-Rated Books (Thresholded) */}
          <section className="mt-8 space-y-3">
            <h3 className="font-serif text-xl font-semibold text-[#0B1020]">
              4. Highest-Rated Books (≥ {report.appliedFilters.minRatingCount} Ratings)
            </h3>
            {report.highestRatedBooks.length === 0 ? (
              <p className="text-xs text-[#4B5563]">
                No books met the selected minimum rating count threshold.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#111827]/20 text-[#374151]">
                      <th className="py-2 pr-3 font-semibold">Title</th>
                      <th className="py-2 px-2 font-semibold">Author</th>
                      <th className="py-2 px-2 text-right font-semibold">Year</th>
                      <th className="py-2 px-2 text-right font-semibold">Orig. Rating</th>
                      <th className="py-2 px-2 text-right font-semibold">Ratings</th>
                      <th className="py-2 px-2 text-right font-semibold">Bayesian</th>
                      <th className="py-2 pl-2 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111827]/10">
                    {report.highestRatedBooks.slice(0, 10).map((b) => (
                      <tr key={b.id}>
                        <td className="py-2 pr-3 font-medium text-[#0B1020]">{b.title}</td>
                        <td className="py-2 px-2 text-[#374151]">
                          {b.authors[0] ?? 'Not Available'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {b.publicationYear ?? 'N/A'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold tabular-nums">
                          {b.averageRating !== null ? b.averageRating.toFixed(2) : 'Not Rated'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {b.ratingsCount !== null ? b.ratingsCount.toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {b.bayesianScore !== null ? b.bayesianScore.toFixed(3) : 'N/A'}
                        </td>
                        <td className="py-2 pl-2 text-[#4B5563]">
                          {b.dataSource.replace(' API', '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 5. Publication-Year Trends Summary */}
          <section className="mt-8 space-y-3">
            <h3 className="font-serif text-xl font-semibold text-[#0B1020]">
              5. Publication-Year Trends (Recent 12 Verified Years in Selection)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-[#111827]/20 text-[#374151]">
                    <th className="py-2 pr-3 font-semibold">Publication Year</th>
                    <th className="py-2 px-2 text-right font-semibold">Books</th>
                    <th className="py-2 px-2 text-right font-semibold">Total Ratings</th>
                    <th className="py-2 px-2 text-right font-semibold">Unweighted Avg</th>
                    <th className="py-2 pl-2 text-right font-semibold">Weighted Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111827]/10">
                  {report.yearTrends
                    .slice(-12)
                    .reverse()
                    .map((y) => (
                      <tr key={y.year}>
                        <td className="py-2 pr-3 font-mono font-medium text-[#0B1020]">
                          {y.year}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {y.bookCount}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {y.totalRatings.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {y.unweightedAvgRating !== null
                            ? y.unweightedAvgRating.toFixed(2)
                            : 'Not Rated'}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono font-semibold tabular-nums">
                          {y.weightedAvgRating !== null
                            ? y.weightedAvgRating.toFixed(2)
                            : 'Not Rated'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="mt-10 border-t border-[#111827]/15 pt-4 text-xs text-[#4B5563]">
            Book Rating Analysis — Developed by {report.projectMetadata.studentName} (Project ID:{' '}
            {report.projectMetadata.projectId}, Section {report.projectMetadata.section},{' '}
            {report.projectMetadata.academicYear}). All figures reflect genuine public catalog data
            without synthetic substitution.
          </footer>
        </article>
      )}
    </div>
  );
}
