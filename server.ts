import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  attachBayesianScores,
  buildAnalyticsPayload,
  buildRecommendationsPayload,
  buildReportPayload,
} from './shared/analytics.ts';
import {
  clearSearchHistory,
  getBookById,
  getFilterFacets,
  getSearchHistory,
  getSearchSuggestions,
  getSourceCounts,
  queryBooks,
  recordSearchHistory,
  updateBookDescription,
} from './server/db.ts';
import {
  collectRealCorpus,
  fetchOpenLibraryWorkDescription,
  providerRuntimeState,
  searchGoogleBooks,
  searchOpenLibrary,
} from './server/bookProviders.ts';
import type { BookFilterParams } from './server/db.ts';
import type { BookRecord, ProviderStatus } from './shared/types.ts';

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

function parseOptionalNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function parseFilters(query: express.Request['query']): BookFilterParams {
  const validSearchTypes = new Set(['all', 'title', 'author', 'isbn', 'genre']);
  const rawType = typeof query.searchType === 'string' ? query.searchType : 'all';

  return {
    q: typeof query.q === 'string' ? query.q.slice(0, 160) : undefined,
    searchType: validSearchTypes.has(rawType)
      ? (rawType as BookFilterParams['searchType'])
      : 'all',
    genre: typeof query.genre === 'string' ? query.genre.slice(0, 80) : undefined,
    source: typeof query.source === 'string' ? query.source.slice(0, 60) : undefined,
    author: typeof query.author === 'string' ? query.author.slice(0, 120) : undefined,
    language: typeof query.language === 'string' ? query.language.slice(0, 40) : undefined,
    yearMin: parseOptionalNumber(query.yearMin),
    yearMax: parseOptionalNumber(query.yearMax),
    minRating: parseOptionalNumber(query.minRating),
    minRatingCount: parseOptionalNumber(query.minRatingCount),
  };
}

function sortBooks(books: BookRecord[], sort: string): BookRecord[] {
  const list = [...books];
  switch (sort) {
    case 'highest_rated':
      return list.sort((a, b) => {
        const ra = a.averageRating ?? -1;
        const rb = b.averageRating ?? -1;
        if (Math.abs(rb - ra) > 0.0001) return rb - ra;
        return (b.ratingsCount ?? -1) - (a.ratingsCount ?? -1);
      });
    case 'most_rated':
      return list.sort((a, b) => (b.ratingsCount ?? -1) - (a.ratingsCount ?? -1));
    case 'newest':
      return list.sort((a, b) => (b.publicationYear ?? -1) - (a.publicationYear ?? -1));
    case 'oldest':
      return list.sort((a, b) => {
        const ya = a.publicationYear ?? 99999;
        const yb = b.publicationYear ?? 99999;
        return ya - yb;
      });
    case 'title_asc':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'recent':
    default:
      return list.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Trigger initial live dataset collection asynchronously if SQLite corpus is sparse
  const initialCounts = getSourceCounts();
  if (initialCounts.total < 60) {
    collectRealCorpus().catch((err) => {
      console.error('Initial corpus collection warning:', err);
    });
  }

  // 1. Provider & dataset status
  app.get('/api/status', (_req, res) => {
    const counts = getSourceCounts();
    const status: ProviderStatus = {
      googleBooks: {
        configuredWithApiKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY?.trim()),
        lastError: providerRuntimeState.googleBooksLastError,
        lastStatusCode: providerRuntimeState.googleBooksLastStatus,
        cachedBookCount: counts.googleBooks,
      },
      openLibrary: {
        lastError: providerRuntimeState.openLibraryLastError,
        lastStatusCode: providerRuntimeState.openLibraryLastStatus,
        cachedBookCount: counts.openLibrary,
      },
      isSeeding: providerRuntimeState.isSeeding,
      totalCachedBooks: counts.total,
      lastUpdatedAt: counts.lastUpdatedAt,
    };
    res.json(status);
  });

  // 2. Refresh / collect live multi-genre corpus on demand
  app.post('/api/collect', async (_req, res) => {
    try {
      const result = await collectRealCorpus();
      const counts = getSourceCounts();
      res.json({
        collected: result.collected,
        errors: result.errors,
        totalCachedBooks: counts.total,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Collection failed',
      });
    }
  });

  // 3. Query local structured book dataset with filters, sorting & pagination
  app.get('/api/books', (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'most_rated';
      const page = Math.max(1, Math.trunc(parseOptionalNumber(req.query.page) ?? 1));
      const limit = Math.min(48, Math.max(1, Math.trunc(parseOptionalNumber(req.query.limit) ?? 16)));
      const bayesianM = Math.max(1, Math.min(5000, Math.trunc(parseOptionalNumber(req.query.m) ?? 50)));

      const allMatching = queryBooks(filters);
      const sorted = sortBooks(allMatching, sort);
      const { scored, globalMeanC } = attachBayesianScores(sorted, bayesianM);

      const total = scored.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * limit;
      const items = scored.slice(start, start + limit);

      res.json({
        items,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
        facets: getFilterFacets(),
        bayesianGlobalMeanC: globalMeanC,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to query books',
      });
    }
  });

  // 4. Live API search endpoint (Google Books API and/or Open Library API)
  app.get('/api/search/live', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 160) : '';
      const validTypes = new Set(['all', 'title', 'author', 'isbn', 'genre']);
      const searchType = (
        typeof req.query.searchType === 'string' && validTypes.has(req.query.searchType)
          ? req.query.searchType
          : 'all'
      ) as 'all' | 'title' | 'author' | 'isbn' | 'genre';
      const provider =
        typeof req.query.provider === 'string' ? req.query.provider : 'both';

      if (!q) {
        res.status(400).json({ error: 'Search query parameter "q" is required.' });
        return;
      }

      const providerErrors: Array<{ provider: string; message: string; statusCode?: number }> = [];
      const fetchedBooks: BookRecord[] = [];
      let totalRemoteItems = 0;

      if (provider === 'google' || provider === 'both') {
        const gbRes = await searchGoogleBooks(q, { searchType, maxResults: 20 });
        if (gbRes.error) {
          providerErrors.push({
            provider: 'Google Books API',
            message: gbRes.error,
            statusCode: gbRes.statusCode,
          });
        }
        fetchedBooks.push(...gbRes.books);
        totalRemoteItems += gbRes.totalItems;
      }

      if (provider === 'openlibrary' || provider === 'both') {
        const olRes = await searchOpenLibrary(q, { searchType, limit: 20 });
        if (olRes.error) {
          providerErrors.push({
            provider: 'Open Library API',
            message: olRes.error,
            statusCode: olRes.statusCode,
          });
        }
        fetchedBooks.push(...olRes.books);
        totalRemoteItems += olRes.totalItems;
      }

      recordSearchHistory(q, searchType, provider, fetchedBooks.length);

      const { scored } = attachBayesianScores(fetchedBooks, 50);
      res.json({
        query: q,
        searchType,
        provider,
        books: scored,
        totalRemoteItems,
        providerErrors,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Live API search failed',
      });
    }
  });

  // 5. Search suggestions & history
  app.get('/api/search/suggestions', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
    res.json({ suggestions: getSearchSuggestions(q) });
  });

  app.get('/api/search/history', (_req, res) => {
    res.json({ history: getSearchHistory() });
  });

  app.delete('/api/search/history', (_req, res) => {
    clearSearchHistory();
    res.json({ cleared: true });
  });

  // 6. Book details (with live description enrichment if absent)
  app.get('/api/books/:id', async (req, res) => {
    try {
      const id = String(req.params.id ?? '').slice(0, 120);
      const book = getBookById(id);
      if (!book) {
        res.status(404).json({ error: 'Book not found in dataset.' });
        return;
      }

      let enrichedBook = book;
      if (!book.description && book.dataSource === 'Open Library API') {
        const desc = await fetchOpenLibraryWorkDescription(book.sourceItemId);
        if (desc) {
          updateBookDescription(book.id, desc);
          enrichedBook = { ...book, description: desc };
        }
      }

      const allBooks = queryBooks({ source: book.dataSource });
      const { scored, globalMeanC } = attachBayesianScores(allBooks, 50);
      const matched = scored.find((b) => b.id === enrichedBook.id);

      res.json({
        book: {
          ...enrichedBook,
          bayesianScore: matched?.bayesianScore ?? null,
          rankingBasis: matched?.rankingBasis ?? '',
        },
        bayesianGlobalMeanC: globalMeanC,
        bayesianThresholdM: 50,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load book details',
      });
    }
  });

  // 7. Analytics Dashboard endpoint (all 8 visualizations computed live from filtered SQLite dataset)
  app.get('/api/analytics', (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const minCount = Math.max(
        1,
        Math.min(5000, Math.trunc(parseOptionalNumber(req.query.minRatingCount) ?? 50))
      );
      // Do not exclude low-count books from summary/genre/year analytics when only configuring the Highest Rated threshold
      const datasetFilters: BookFilterParams = {
        ...filters,
        minRatingCount: null,
      };
      const books = queryBooks(datasetFilters);
      const payload = buildAnalyticsPayload(books, minCount);
      res.json({
        ...payload,
        facets: getFilterFacets(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to compute analytics',
      });
    }
  });

  // 8. Confidence-aware Bayesian Recommendations endpoint
  app.get('/api/recommendations', (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const m = Math.max(1, Math.min(5000, Math.trunc(parseOptionalNumber(req.query.m) ?? 50)));
      const books = queryBooks({
        source: filters.source,
        genre: filters.genre,
        language: filters.language,
      });
      const payload = buildRecommendationsPayload(books, m);
      res.json({
        ...payload,
        facets: getFilterFacets(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to compute recommendations',
      });
    }
  });

  // 9. Academic Book Rating Analytics Report endpoint
  app.get('/api/report', (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const minRatingCount = Math.max(
        1,
        Math.min(5000, Math.trunc(parseOptionalNumber(req.query.minRatingCount) ?? 50))
      );
      const books = queryBooks({
        ...filters,
        minRatingCount: null,
      });
      const payload = buildReportPayload(books, {
        source: filters.source && filters.source !== 'all' ? filters.source : 'All Sources',
        genre: filters.genre && filters.genre !== 'all' ? filters.genre : 'All Genres',
        yearMin: filters.yearMin ?? null,
        yearMax: filters.yearMax ?? null,
        minRatingCount,
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate report',
      });
    }
  });

  // Mount Vite middleware in dev, or serve static dist/ in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Book Rating Analysis server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
