import type { BookRecord, RatingDistribution } from '../shared/types.ts';
import { getCachedResponse, setCachedResponse, upsertBooks } from './db.ts';

export interface ProviderSearchResult {
  books: BookRecord[];
  totalItems: number;
  provider: 'Google Books API' | 'Open Library API';
  fromCache: boolean;
  error?: string;
  statusCode?: number;
}

export const providerRuntimeState = {
  googleBooksLastError: null as string | null,
  googleBooksLastStatus: null as number | null,
  openLibraryLastError: null as string | null,
  openLibraryLastStatus: null as number | null,
  isSeeding: false,
};

const GENRE_RULES: Array<{ genre: string; patterns: RegExp[] }> = [
  { genre: 'Science Fiction', patterns: [/science\s*fiction/i, /\bsci[\s-]*fi\b/i, /dystopi/i, /cyberpunk/i, /space\s*opera/i] },
  { genre: 'Fantasy', patterns: [/\bfantasy\b/i, /epic\s*fantasy/i, /magic/i, /sword\s*and\s*sorcery/i] },
  { genre: 'Mystery & Thriller', patterns: [/mystery/i, /thriller/i, /detective/i, /crime\s*fiction/i, /suspense/i, /noir/i] },
  { genre: 'Biography & Memoir', patterns: [/biography/i, /autobiography/i, /memoir/i] },
  { genre: 'History', patterns: [/\bhistory\b/i, /historical/i, /world\s*war/i, /ancient\s*civiliz/i] },
  { genre: 'Philosophy', patterns: [/philosophy/i, /stoicism/i, /ethics/i, /existentialism/i] },
  { genre: 'Psychology', patterns: [/psychology/i, /cognitive/i, /behavioral/i, /neuroscience/i] },
  { genre: 'Science & Technology', patterns: [/\bscience\b/i, /physics/i, /astronomy/i, /biology/i, /mathematics/i, /computer/i, /technology/i, /data\s*science/i, /engineering/i] },
  { genre: 'Business & Economics', patterns: [/business/i, /economics/i, /finance/i, /management/i, /entrepreneur/i] },
  { genre: 'Self-Help', patterns: [/self[\s-]*help/i, /personal\s*growth/i, /productivity/i] },
  { genre: 'Classics & Literature', patterns: [/classic/i, /literary/i, /literature/i, /poetry/i, /drama/i] },
  { genre: 'Fiction', patterns: [/\bfiction\b/i, /\bnovel\b/i, /romance/i, /young\s*adult/i, /horror/i] },
];

export function normalizePrimaryGenre(rawCategories: string[] | undefined, fallbackHint?: string): {
  primaryGenre: string;
  cleanedCategories: string[];
} {
  const cleaned = (rawCategories ?? [])
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && c.length <= 60 && !c.includes('=') && !c.startsWith('nyt:'));

  const uniqueCleaned = Array.from(new Set(cleaned)).slice(0, 12);

  for (const rule of GENRE_RULES) {
    if (uniqueCleaned.some((cat) => rule.patterns.some((p) => p.test(cat)))) {
      return { primaryGenre: rule.genre, cleanedCategories: uniqueCleaned };
    }
  }

  if (fallbackHint) {
    for (const rule of GENRE_RULES) {
      if (rule.patterns.some((p) => p.test(fallbackHint))) {
        return { primaryGenre: rule.genre, cleanedCategories: uniqueCleaned };
      }
    }
  }

  if (uniqueCleaned.length > 0) {
    const firstSegment = uniqueCleaned[0].split('/')[0].split(',')[0].trim();
    if (firstSegment.length >= 3 && firstSegment.length <= 32) {
      return {
        primaryGenre: toTitleCase(firstSegment),
        cleanedCategories: uniqueCleaned,
      };
    }
  }

  return { primaryGenre: 'Uncategorized', cleanedCategories: uniqueCleaned };
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function extractValidYear(dateInput: string | number | undefined | null): number | null {
  if (typeof dateInput === 'number') {
    const y = Math.trunc(dateInput);
    return y >= 1450 && y <= 2026 ? y : null;
  }
  if (typeof dateInput !== 'string') return null;
  const match = dateInput.match(/\b(1[4-9]\d{2}|20[0-2]\d)\b/);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1450 && year <= 2026 ? year : null;
}

export function sanitizeExternalUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeLanguageCode(lang: string | undefined | null): string | null {
  if (!lang || typeof lang !== 'string') return null;
  const code = lang.trim().toLowerCase();
  const map: Record<string, string> = {
    en: 'English',
    eng: 'English',
    es: 'Spanish',
    spa: 'Spanish',
    fr: 'French',
    fre: 'French',
    fra: 'French',
    de: 'German',
    ger: 'German',
    deu: 'German',
    it: 'Italian',
    ita: 'Italian',
    pt: 'Portuguese',
    por: 'Portuguese',
    ru: 'Russian',
    rus: 'Russian',
    ja: 'Japanese',
    jpn: 'Japanese',
    zh: 'Chinese',
    chi: 'Chinese',
    hi: 'Hindi',
    hin: 'Hindi',
  };
  return map[code] ?? code.toUpperCase();
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      medium?: string;
      large?: string;
    };
    averageRating?: number;
    ratingsCount?: number;
    language?: string;
    pageCount?: number;
    previewLink?: string;
    infoLink?: string;
  };
}

function mapGoogleVolumeToBook(vol: GoogleBooksVolume, genreHint?: string): BookRecord | null {
  const info = vol.volumeInfo;
  if (!vol.id || !info?.title) return null;

  const isbn13Obj = info.industryIdentifiers?.find((i) => i.type === 'ISBN_13');
  const isbn10Obj = info.industryIdentifiers?.find((i) => i.type === 'ISBN_10');

  const rawCover =
    info.imageLinks?.medium ||
    info.imageLinks?.large ||
    info.imageLinks?.thumbnail ||
    info.imageLinks?.smallThumbnail ||
    null;

  // Strictly preserve missing ratings as null — NEVER substitute 0, 3, 4, or 5
  const averageRating =
    typeof info.averageRating === 'number' &&
    Number.isFinite(info.averageRating) &&
    info.averageRating >= 1 &&
    info.averageRating <= 5
      ? info.averageRating
      : null;

  const ratingsCount =
    typeof info.ratingsCount === 'number' &&
    Number.isFinite(info.ratingsCount) &&
    info.ratingsCount > 0
      ? Math.trunc(info.ratingsCount)
      : null;

  const { primaryGenre, cleanedCategories } = normalizePrimaryGenre(info.categories, genreHint);
  const infoLink = sanitizeExternalUrl(info.infoLink) ?? `https://books.google.com/books?id=${encodeURIComponent(vol.id)}`;

  return {
    id: `gb_${vol.id}`,
    sourceItemId: vol.id,
    dataSource: 'Google Books API',
    isbn13: isbn13Obj?.identifier ?? null,
    isbn10: isbn10Obj?.identifier ?? null,
    editionKey: vol.id,
    title: info.title.trim(),
    subtitle: info.subtitle?.trim() ?? null,
    authors: Array.isArray(info.authors) && info.authors.length > 0 ? info.authors : [],
    publisher: info.publisher?.trim() ?? null,
    publishedDate: info.publishedDate?.trim() ?? null,
    publicationYear: extractValidYear(info.publishedDate),
    primaryGenre,
    categories: cleanedCategories,
    language: normalizeLanguageCode(info.language),
    pageCount:
      typeof info.pageCount === 'number' && info.pageCount > 0 ? Math.trunc(info.pageCount) : null,
    description: info.description?.trim() ?? null,
    coverUrl: sanitizeExternalUrl(rawCover),
    averageRating: averageRating !== null && ratingsCount !== null ? averageRating : averageRating,
    ratingsCount,
    ratingDistribution: null, // Google Books API does not expose 1-5 star breakdown
    previewLink: sanitizeExternalUrl(info.previewLink),
    infoLink,
    sourceUrl: infoLink,
    fetchedAt: new Date().toISOString(),
  };
}

export async function searchGoogleBooks(
  query: string,
  options: {
    searchType?: 'all' | 'title' | 'author' | 'isbn' | 'genre';
    maxResults?: number;
    startIndex?: number;
    genreHint?: string;
  } = {}
): Promise<ProviderSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { books: [], totalItems: 0, provider: 'Google Books API', fromCache: false };
  }

  let formattedQ = trimmed;
  if (options.searchType === 'title') formattedQ = `intitle:${trimmed}`;
  else if (options.searchType === 'author') formattedQ = `inauthor:${trimmed}`;
  else if (options.searchType === 'isbn') formattedQ = `isbn:${trimmed.replace(/[^0-9Xx]/g, '')}`;
  else if (options.searchType === 'genre') formattedQ = `subject:${trimmed}`;

  const maxResults = Math.min(40, Math.max(1, options.maxResults ?? 20));
  const startIndex = Math.max(0, options.startIndex ?? 0);
  const cacheKey = `gb:${formattedQ}:${startIndex}:${maxResults}`;

  const cached = getCachedResponse<{ books: BookRecord[]; totalItems: number }>(cacheKey);
  if (cached) {
    return {
      books: cached.books,
      totalItems: cached.totalItems,
      provider: 'Google Books API',
      fromCache: true,
    };
  }

  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', formattedQ);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('startIndex', String(startIndex));
  url.searchParams.set('printType', 'books');

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (apiKey) {
    url.searchParams.set('key', apiKey);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    providerRuntimeState.googleBooksLastStatus = resp.status;

    if (!resp.ok) {
      let detail = `Google Books API returned HTTP ${resp.status}`;
      try {
        const errBody = (await resp.json()) as { error?: { message?: string } };
        if (errBody?.error?.message) {
          detail = errBody.error.message;
        }
      } catch {
        // ignore JSON parse failure
      }
      if (resp.status === 429) {
        detail =
          'Google Books API returned HTTP 429 (Quota exceeded on this server IP). Add a GOOGLE_BOOKS_API_KEY secret for dedicated Google Books quota, or query the live Open Library API.';
      }
      providerRuntimeState.googleBooksLastError = detail;
      return {
        books: [],
        totalItems: 0,
        provider: 'Google Books API',
        fromCache: false,
        error: detail,
        statusCode: resp.status,
      };
    }

    providerRuntimeState.googleBooksLastError = null;
    const json = (await resp.json()) as { totalItems?: number; items?: GoogleBooksVolume[] };
    const books = (json.items ?? [])
      .map((v) => mapGoogleVolumeToBook(v, options.genreHint))
      .filter((b): b is BookRecord => b !== null);

    if (books.length > 0) {
      upsertBooks(books);
      setCachedResponse(cacheKey, 'Google Books API', {
        books,
        totalItems: json.totalItems ?? books.length,
      });
    }

    return {
      books,
      totalItems: json.totalItems ?? books.length,
      provider: 'Google Books API',
      fromCache: false,
      statusCode: resp.status,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to reach Google Books API';
    providerRuntimeState.googleBooksLastError = message;
    return {
      books: [],
      totalItems: 0,
      provider: 'Google Books API',
      fromCache: false,
      error: `Google Books API unavailable: ${message}`,
    };
  }
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  publish_date?: string[];
  isbn?: string[];
  subject?: string[];
  cover_i?: number;
  ratings_average?: number;
  ratings_count?: number;
  ratings_count_1?: number;
  ratings_count_2?: number;
  ratings_count_3?: number;
  ratings_count_4?: number;
  ratings_count_5?: number;
  language?: string[];
  number_of_pages_median?: number;
  publisher?: string[];
  edition_key?: string[];
}

function mapOpenLibraryDocToBook(doc: OpenLibraryDoc, genreHint?: string): BookRecord | null {
  if (!doc.key || !doc.title) return null;
  const workId = doc.key.replace(/^\/works\//, '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!workId) return null;

  const isbns = Array.isArray(doc.isbn) ? doc.isbn : [];
  const isbn13 = isbns.find((i) => /^\d{13}$/.test(i)) ?? null;
  const isbn10 = isbns.find((i) => /^\d{9}[\dXx]$/.test(i)) ?? null;

  const hasValidRatings =
    typeof doc.ratings_average === 'number' &&
    Number.isFinite(doc.ratings_average) &&
    doc.ratings_average >= 1 &&
    doc.ratings_average <= 5 &&
    typeof doc.ratings_count === 'number' &&
    Number.isFinite(doc.ratings_count) &&
    doc.ratings_count > 0;

  let ratingDistribution: RatingDistribution | null = null;
  if (hasValidRatings) {
    const c1 = typeof doc.ratings_count_1 === 'number' ? doc.ratings_count_1 : 0;
    const c2 = typeof doc.ratings_count_2 === 'number' ? doc.ratings_count_2 : 0;
    const c3 = typeof doc.ratings_count_3 === 'number' ? doc.ratings_count_3 : 0;
    const c4 = typeof doc.ratings_count_4 === 'number' ? doc.ratings_count_4 : 0;
    const c5 = typeof doc.ratings_count_5 === 'number' ? doc.ratings_count_5 : 0;
    if (c1 + c2 + c3 + c4 + c5 > 0) {
      ratingDistribution = { 1: c1, 2: c2, 3: c3, 4: c4, 5: c5 };
    }
  }

  const { primaryGenre, cleanedCategories } = normalizePrimaryGenre(doc.subject, genreHint);
  const year = extractValidYear(doc.first_publish_year ?? doc.publish_date?.[0] ?? null);
  const preferredLang =
    doc.language?.includes('eng') ? 'eng' : doc.language?.[0] ?? null;

  const sourceUrl = `https://openlibrary.org/works/${encodeURIComponent(workId)}`;
  const coverUrl =
    typeof doc.cover_i === 'number' && doc.cover_i > 0
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null;

  return {
    id: `ol_${workId}`,
    sourceItemId: workId,
    dataSource: 'Open Library API',
    isbn13,
    isbn10,
    editionKey: doc.edition_key?.[0] ?? workId,
    title: doc.title.trim(),
    subtitle: doc.subtitle?.trim() ?? null,
    authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 5) : [],
    publisher: doc.publisher?.[0]?.trim() ?? null,
    publishedDate: year ? String(year) : doc.publish_date?.[0] ?? null,
    publicationYear: year,
    primaryGenre,
    categories: cleanedCategories,
    language: normalizeLanguageCode(preferredLang),
    pageCount:
      typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0
        ? Math.trunc(doc.number_of_pages_median)
        : null,
    description: null,
    coverUrl,
    averageRating: hasValidRatings ? Math.round((doc.ratings_average as number) * 1000) / 1000 : null,
    ratingsCount: hasValidRatings ? Math.trunc(doc.ratings_count as number) : null,
    ratingDistribution,
    previewLink: sourceUrl,
    infoLink: sourceUrl,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}

const OL_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'first_publish_year',
  'publish_date',
  'isbn',
  'subject',
  'cover_i',
  'ratings_average',
  'ratings_count',
  'ratings_count_1',
  'ratings_count_2',
  'ratings_count_3',
  'ratings_count_4',
  'ratings_count_5',
  'language',
  'number_of_pages_median',
  'publisher',
  'edition_key',
].join(',');

export async function searchOpenLibrary(
  query: string,
  options: {
    searchType?: 'all' | 'title' | 'author' | 'isbn' | 'genre';
    limit?: number;
    offset?: number;
    sort?: 'rating' | 'editions' | 'new' | 'old' | '';
    genreHint?: string;
  } = {}
): Promise<ProviderSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { books: [], totalItems: 0, provider: 'Open Library API', fromCache: false };
  }

  const limit = Math.min(40, Math.max(1, options.limit ?? 24));
  const offset = Math.max(0, options.offset ?? 0);
  const sort = options.sort ?? '';
  const type = options.searchType ?? 'all';
  const cacheKey = `ol:${type}:${trimmed}:${sort}:${offset}:${limit}`;

  const cached = getCachedResponse<{ books: BookRecord[]; totalItems: number }>(cacheKey);
  if (cached) {
    return {
      books: cached.books,
      totalItems: cached.totalItems,
      provider: 'Open Library API',
      fromCache: true,
    };
  }

  const url = new URL('https://openlibrary.org/search.json');
  if (type === 'title') url.searchParams.set('title', trimmed);
  else if (type === 'author') url.searchParams.set('author', trimmed);
  else if (type === 'isbn') url.searchParams.set('isbn', trimmed.replace(/[^0-9Xx]/g, ''));
  else if (type === 'genre') url.searchParams.set('subject', trimmed);
  else url.searchParams.set('q', trimmed);

  url.searchParams.set('fields', OL_FIELDS);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (sort) url.searchParams.set('sort', sort);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BookRatingAnalysis-AcademicMiniProject/1.0 (DataScience)',
      },
    });
    clearTimeout(timeout);

    providerRuntimeState.openLibraryLastStatus = resp.status;

    if (!resp.ok) {
      const detail = `Open Library API returned HTTP ${resp.status}`;
      providerRuntimeState.openLibraryLastError = detail;
      return {
        books: [],
        totalItems: 0,
        provider: 'Open Library API',
        fromCache: false,
        error: detail,
        statusCode: resp.status,
      };
    }

    providerRuntimeState.openLibraryLastError = null;
    const json = (await resp.json()) as { numFound?: number; docs?: OpenLibraryDoc[] };
    const books = (json.docs ?? [])
      .map((d) => mapOpenLibraryDocToBook(d, options.genreHint))
      .filter((b): b is BookRecord => b !== null);

    if (books.length > 0) {
      upsertBooks(books);
      setCachedResponse(cacheKey, 'Open Library API', {
        books,
        totalItems: json.numFound ?? books.length,
      });
    }

    return {
      books,
      totalItems: json.numFound ?? books.length,
      provider: 'Open Library API',
      fromCache: false,
      statusCode: resp.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to reach Open Library API';
    providerRuntimeState.openLibraryLastError = message;
    return {
      books: [],
      totalItems: 0,
      provider: 'Open Library API',
      fromCache: false,
      error: `Open Library API unavailable: ${message}`,
    };
  }
}

export async function fetchOpenLibraryWorkDescription(workId: string): Promise<string | null> {
  const safeId = workId.replace(/[^A-Za-z0-9_-]/g, '');
  if (!safeId) return null;
  const cacheKey = `ol_work_desc:${safeId}`;
  const cached = getCachedResponse<{ description: string | null }>(cacheKey);
  if (cached) return cached.description;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`https://openlibrary.org/works/${encodeURIComponent(safeId)}.json`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BookRatingAnalysis-AcademicMiniProject/1.0 (DataScience)',
      },
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;

    const json = (await resp.json()) as { description?: string | { value?: string } };
    const text =
      typeof json.description === 'string'
        ? json.description.trim()
        : typeof json.description?.value === 'string'
          ? json.description.value.trim()
          : null;

    setCachedResponse(cacheKey, 'Open Library API', { description: text }, 1000 * 60 * 60 * 24 * 7);
    return text;
  } catch {
    return null;
  }
}

const INITIAL_SUBJECTS: Array<{ subject: string; genreHint: string }> = [
  { subject: 'fiction', genreHint: 'Fiction' },
  { subject: 'science fiction', genreHint: 'Science Fiction' },
  { subject: 'fantasy', genreHint: 'Fantasy' },
  { subject: 'mystery', genreHint: 'Mystery & Thriller' },
  { subject: 'history', genreHint: 'History' },
  { subject: 'biography', genreHint: 'Biography & Memoir' },
  { subject: 'science', genreHint: 'Science & Technology' },
  { subject: 'philosophy', genreHint: 'Philosophy' },
  { subject: 'psychology', genreHint: 'Psychology' },
  { subject: 'business', genreHint: 'Business & Economics' },
];

/**
 * Populates the local SQLite database with 100% genuine books fetched live from public APIs.
 * Tries Google Books API first when configured, and collects multi-genre real rating data
 * from Open Library API so analytics and star distributions are grounded in real data.
 */
export async function collectRealCorpus(): Promise<{ collected: number; errors: string[] }> {
  if (providerRuntimeState.isSeeding) {
    return { collected: 0, errors: [] };
  }
  providerRuntimeState.isSeeding = true;
  const errors: string[] = [];
  let collected = 0;

  try {
    // Attempt Google Books API first for primary subjects if API key is present or quota allows
    const probeGb = await searchGoogleBooks('subject:fiction', {
      maxResults: 20,
      genreHint: 'Fiction',
    });
    if (probeGb.books.length > 0) {
      collected += probeGb.books.length;
      const gbExtraSubjects = ['science fiction', 'history', 'philosophy', 'biography'];
      for (const subj of gbExtraSubjects) {
        const res = await searchGoogleBooks(`subject:${subj}`, {
          maxResults: 15,
          genreHint: subj,
        });
        collected += res.books.length;
        if (res.error) {
          errors.push(res.error);
          break;
        }
      }
    } else if (probeGb.error) {
      errors.push(probeGb.error);
    }

    // Collect verified real multi-genre books with genuine ratings & star distributions from Open Library API
    const batchResults = await Promise.allSettled(
      INITIAL_SUBJECTS.map(({ subject, genreHint }) =>
        searchOpenLibrary(subject, {
          searchType: 'genre',
          limit: 22,
          sort: 'rating',
          genreHint,
        })
      )
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        collected += r.value.books.length;
        if (r.value.error) errors.push(r.value.error);
      }
    }
  } finally {
    providerRuntimeState.isSeeding = false;
  }

  return { collected, errors };
}
