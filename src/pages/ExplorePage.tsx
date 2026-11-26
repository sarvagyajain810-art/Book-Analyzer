import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutGrid,
  List,
  RotateCcw,
} from 'lucide-react';
import { api, type FacetsResponse } from '../lib/api.ts';
import type { BookWithScore } from '../../shared/types.ts';
import { BookCard } from '../components/BookCard.tsx';
import { SearchBar } from '../components/SearchBar.tsx';

interface ExplorePageProps {
  initialQuery?: string;
  initialGenre?: string;
  initialSearchType?: string;
  onSelectBook: (bookId: string) => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export function ExplorePage({
  initialQuery = '',
  initialGenre = 'all',
  initialSearchType = 'all',
  onSelectBook,
  onNotify,
}: ExplorePageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState(initialSearchType);

  const [genre, setGenre] = useState(initialGenre);
  const [source, setSource] = useState('all');
  const [language, setLanguage] = useState('all');
  const [author, setAuthor] = useState('');
  const [debouncedAuthor, setDebouncedAuthor] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minRatingCount, setMinRatingCount] = useState('');
  const [sort, setSort] = useState('most_rated');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [books, setBooks] = useState<BookWithScore[]>([]);
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live API query state
  const [liveProvider, setLiveProvider] = useState<'both' | 'google' | 'openlibrary'>('both');
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveNotices, setLiveNotices] = useState<
    Array<{ provider: string; message: string; statusCode?: number }>
  >([]);

  useEffect(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setGenre(initialGenre);
    setPage(1);
  }, [initialGenre]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedAuthor(author);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [author]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBooks({
        q: debouncedQuery || undefined,
        searchType,
        genre: genre !== 'all' ? genre : undefined,
        source: source !== 'all' ? source : undefined,
        language: language !== 'all' ? language : undefined,
        author: debouncedAuthor || undefined,
        yearMin: yearMin ? Number(yearMin) : null,
        yearMax: yearMax ? Number(yearMax) : null,
        minRating: minRating ? Number(minRating) : null,
        minRatingCount: minRatingCount ? Number(minRatingCount) : null,
        sort,
        page,
        limit: viewMode === 'grid' ? 12 : 10,
      });
      setBooks(res.items);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setFacets(res.facets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch books.');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    searchType,
    genre,
    source,
    language,
    debouncedAuthor,
    yearMin,
    yearMax,
    minRating,
    minRatingCount,
    sort,
    page,
    viewMode,
  ]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleLiveApiSearch = async (searchTerm?: string, fieldType?: string) => {
    const activeQ = (searchTerm ?? query).trim();
    if (!activeQ) {
      onNotify('info', 'Enter a book title, author, ISBN, or genre to search live APIs.');
      return;
    }
    setLiveSearching(true);
    setLiveNotices([]);
    try {
      const res = await api.searchLive({
        q: activeQ,
        searchType: fieldType ?? searchType,
        provider: liveProvider,
      });
      setLiveNotices(res.providerErrors);
      if (res.books.length > 0) {
        onNotify(
          'success',
          `Fetched ${res.books.length} real book records into SQLite for "${activeQ}".`
        );
      } else if (res.providerErrors.length > 0) {
        onNotify('error', res.providerErrors[0].message);
      } else {
        onNotify('info', `No remote volumes matched "${activeQ}".`);
      }
      setDebouncedQuery(activeQ);
      setPage(1);
      await fetchCatalog();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Live API search failed.');
    } finally {
      setLiveSearching(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchType('all');
    setGenre('all');
    setSource('all');
    setLanguage('all');
    setAuthor('');
    setDebouncedAuthor('');
    setYearMin('');
    setYearMax('');
    setMinRating('');
    setMinRatingCount('');
    setSort('most_rated');
    setPage(1);
    setLiveNotices([]);
    onNotify('info', 'All catalog filters have been reset.');
  };

  const hasActiveFilters =
    Boolean(query) ||
    genre !== 'all' ||
    source !== 'all' ||
    language !== 'all' ||
    Boolean(author) ||
    Boolean(yearMin) ||
    Boolean(yearMax) ||
    Boolean(minRating) ||
    Boolean(minRatingCount);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-[#F5F1E8]/10 pb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#F5F1E8] sm:text-4xl">
          Explore Books
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A5ADBC]">
          Filter the analyzed catalog or query live external APIs (Google Books API &amp; Open
          Library API) to bring new verified editions directly into the dataset.
        </p>
      </div>

      {/* Search & Live API Query Controls */}
      <section className="space-y-4 rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-5">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={(q, type) => {
            setDebouncedQuery(q);
            if (type) setSearchType(type);
            setPage(1);
          }}
          onSelectBook={onSelectBook}
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          showTypeSelector
          placeholder="Search title, author, ISBN-13/10, or genre…"
          submitLabel="Filter Catalog"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F5F1E8]/10 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#A5ADBC]">
            <span>Live External API Query:</span>
            <div className="inline-flex rounded-md border border-[#F5F1E8]/10 bg-[#0B1020] p-0.5">
              {(
                [
                  { id: 'both', label: 'Google + Open Library' },
                  { id: 'google', label: 'Google Books API' },
                  { id: 'openlibrary', label: 'Open Library API' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLiveProvider(opt.id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    liveProvider === opt.id
                      ? 'bg-[#172033] text-[#C6A96B]'
                      : 'text-[#A5ADBC] hover:text-[#F5F1E8]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={liveSearching || !query.trim()}
            onClick={() => handleLiveApiSearch()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#A7BFA3]/40 bg-[#A7BFA3]/10 px-4 text-xs font-semibold text-[#A7BFA3] transition-colors hover:bg-[#A7BFA3] hover:text-[#0B1020] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            <Globe className={`h-3.5 w-3.5 ${liveSearching ? 'animate-spin' : ''}`} />
            {liveSearching ? 'Querying Live API…' : 'Fetch from Live API'}
          </button>
        </div>

        {/* Transparent External API Rate-Limit / Error Notices */}
        {liveNotices.length > 0 && (
          <div className="space-y-2 pt-1">
            {liveNotices.map((notice, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-md border border-amber-400/30 bg-amber-950/25 px-3.5 py-2.5 text-xs text-amber-100"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <span className="font-semibold">{notice.provider}: </span>
                  <span>{notice.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Working Multi-Facet Filter Bar */}
      <section className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#F5F1E8]">Filters &amp; Sorting</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C6A96B] hover:text-[#D5BD88]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Genre</span>
            <select
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                setPage(1);
              }}
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
            <span className="text-[#A5ADBC]">Author</span>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Filter by author name…"
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] placeholder:text-[#A5ADBC]/60 focus:border-[#C6A96B] focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Language</span>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="all">All Languages</option>
              {(facets?.languages ?? []).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Data Source</span>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="all">All Verified Sources</option>
              <option value="Open Library API">Open Library API</option>
              <option value="Google Books API">Google Books API</option>
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Published From Year</span>
            <input
              type="number"
              min={1450}
              max={2026}
              value={yearMin}
              onChange={(e) => {
                setYearMin(e.target.value);
                setPage(1);
              }}
              placeholder={facets?.minYear ? String(facets.minYear) : 'e.g. 1950'}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 font-mono text-sm text-[#F5F1E8] placeholder:text-[#A5ADBC]/60 focus:border-[#C6A96B] focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Published To Year</span>
            <input
              type="number"
              min={1450}
              max={2026}
              value={yearMax}
              onChange={(e) => {
                setYearMax(e.target.value);
                setPage(1);
              }}
              placeholder={facets?.maxYear ? String(facets.maxYear) : 'e.g. 2026'}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 font-mono text-sm text-[#F5F1E8] placeholder:text-[#A5ADBC]/60 focus:border-[#C6A96B] focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Minimum Average Rating</span>
            <select
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="">Any Rating (Includes Unrated)</option>
              <option value="3.5">3.5+ / 5.0</option>
              <option value="4.0">4.0+ / 5.0</option>
              <option value="4.25">4.25+ / 5.0</option>
              <option value="4.5">4.5+ / 5.0</option>
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="text-[#A5ADBC]">Minimum Rating Count</span>
            <select
              value={minRatingCount}
              onChange={(e) => {
                setMinRatingCount(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="">Any Count</option>
              <option value="10">10+ ratings</option>
              <option value="25">25+ ratings</option>
              <option value="50">50+ ratings</option>
              <option value="100">100+ ratings</option>
              <option value="250">250+ ratings</option>
            </select>
          </label>
        </div>
      </section>

      {/* Toolbar: Count, Sort, Grid/List Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#A5ADBC]">
          Showing{' '}
          <span className="font-mono font-semibold tabular-nums text-[#F5F1E8]">
            {total.toLocaleString()}
          </span>{' '}
          matching books
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#A5ADBC]">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-[#F5F1E8]/15 bg-[#111827] px-3 text-xs font-medium text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
            >
              <option value="most_rated">Most Rated</option>
              <option value="highest_rated">Highest Rated</option>
              <option value="newest">Newest Publication</option>
              <option value="oldest">Oldest Publication</option>
              <option value="title_asc">Title A–Z</option>
            </select>
          </label>

          <div
            role="group"
            aria-label="View layout"
            className="inline-flex rounded-md border border-[#F5F1E8]/15 bg-[#111827] p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#172033] text-[#C6A96B]'
                  : 'text-[#A5ADBC] hover:text-[#F5F1E8]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#172033] text-[#C6A96B]'
                  : 'text-[#A5ADBC] hover:text-[#F5F1E8]'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-950/25 p-6 text-center">
          <p className="text-sm text-red-100">{error}</p>
          <button
            type="button"
            onClick={fetchCatalog}
            className="mt-3 rounded-md border border-red-300/30 px-4 py-2 text-xs font-medium text-red-100 hover:bg-red-900/40"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[400px] animate-pulse rounded-lg border border-[#F5F1E8]/10 bg-[#172033]/50"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-lg border border-[#F5F1E8]/10 bg-[#172033]/50"
              />
            ))}
          </div>
        )
      ) : books.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-12 text-center">
          <p className="font-serif text-xl text-[#F5F1E8]">No Matching Books in Local Catalog</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#A5ADBC]">
            {query.trim()
              ? `No cached books matched "${query}". You can query the live external APIs directly or adjust your filters.`
              : 'Try broadening your year range, minimum rating, or genre filters.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {query.trim() && (
              <button
                type="button"
                disabled={liveSearching}
                onClick={() => handleLiveApiSearch()}
                className="rounded-md bg-[#C6A96B] px-4 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#D5BD88]"
              >
                {liveSearching ? 'Querying Live API…' : `Search Live API for "${query}"`}
              </button>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-[#F5F1E8]/20 px-4 py-2 text-xs font-medium text-[#F5F1E8] hover:border-[#C6A96B]/60"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'
                : 'space-y-4'
            }
          >
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                viewMode={viewMode}
                showBayesianScore
                onSelect={onSelectBook}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Catalog pagination"
              className="flex items-center justify-between border-t border-[#F5F1E8]/10 pt-6"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#F5F1E8]/15 px-3.5 text-xs font-medium text-[#F5F1E8] transition-colors hover:border-[#C6A96B]/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <p className="font-mono text-xs tabular-nums text-[#A5ADBC]">
                Page <span className="text-[#F5F1E8]">{page}</span> of{' '}
                <span className="text-[#F5F1E8]">{totalPages}</span>
              </p>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#F5F1E8]/15 px-3.5 text-xs font-medium text-[#F5F1E8] transition-colors hover:border-[#C6A96B]/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
