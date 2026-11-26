import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  BookRecord,
  DataSourceName,
  RatingDistribution,
  SearchHistoryEntry,
} from '../shared/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'book_analytics.sqlite');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    source_item_id TEXT NOT NULL,
    data_source TEXT NOT NULL,
    isbn13 TEXT,
    isbn10 TEXT,
    edition_key TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    authors_json TEXT NOT NULL,
    publisher TEXT,
    published_date TEXT,
    publication_year INTEGER,
    primary_genre TEXT NOT NULL,
    categories_json TEXT NOT NULL,
    language TEXT,
    page_count INTEGER,
    description TEXT,
    cover_url TEXT,
    average_rating REAL,
    ratings_count INTEGER,
    rating_dist_json TEXT,
    preview_link TEXT,
    info_link TEXT,
    source_url TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_books_genre ON books(primary_genre);
  CREATE INDEX IF NOT EXISTS idx_books_year ON books(publication_year);
  CREATE INDEX IF NOT EXISTS idx_books_source ON books(data_source);
  CREATE INDEX IF NOT EXISTS idx_books_rating ON books(average_rating);
  CREATE INDEX IF NOT EXISTS idx_books_count ON books(ratings_count);

  CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    response_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    search_type TEXT NOT NULL,
    source TEXT NOT NULL,
    result_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`);

interface RawBookRow {
  id: string;
  source_item_id: string;
  data_source: string;
  isbn13: string | null;
  isbn10: string | null;
  edition_key: string | null;
  title: string;
  subtitle: string | null;
  authors_json: string;
  publisher: string | null;
  published_date: string | null;
  publication_year: number | null;
  primary_genre: string;
  categories_json: string;
  language: string | null;
  page_count: number | null;
  description: string | null;
  cover_url: string | null;
  average_rating: number | null;
  ratings_count: number | null;
  rating_dist_json: string | null;
  preview_link: string | null;
  info_link: string | null;
  source_url: string;
  fetched_at: string;
}

function rowToBook(row: RawBookRow): BookRecord {
  let authors: string[] = [];
  let categories: string[] = [];
  let ratingDistribution: RatingDistribution | null = null;
  try {
    authors = JSON.parse(row.authors_json);
  } catch {
    authors = [];
  }
  try {
    categories = JSON.parse(row.categories_json);
  } catch {
    categories = [];
  }
  if (row.rating_dist_json) {
    try {
      ratingDistribution = JSON.parse(row.rating_dist_json);
    } catch {
      ratingDistribution = null;
    }
  }

  return {
    id: row.id,
    sourceItemId: row.source_item_id,
    dataSource: row.data_source as DataSourceName,
    isbn13: row.isbn13,
    isbn10: row.isbn10,
    editionKey: row.edition_key,
    title: row.title,
    subtitle: row.subtitle,
    authors,
    publisher: row.publisher,
    publishedDate: row.published_date,
    publicationYear: row.publication_year,
    primaryGenre: row.primary_genre,
    categories,
    language: row.language,
    pageCount: row.page_count,
    description: row.description,
    coverUrl: row.cover_url,
    averageRating: row.average_rating,
    ratingsCount: row.ratings_count,
    ratingDistribution,
    previewLink: row.preview_link,
    infoLink: row.info_link,
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
  };
}

const upsertStmt = db.prepare(`
  INSERT INTO books (
    id, source_item_id, data_source, isbn13, isbn10, edition_key,
    title, subtitle, authors_json, publisher, published_date, publication_year,
    primary_genre, categories_json, language, page_count, description, cover_url,
    average_rating, ratings_count, rating_dist_json, preview_link, info_link,
    source_url, fetched_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    isbn13 = COALESCE(excluded.isbn13, books.isbn13),
    isbn10 = COALESCE(excluded.isbn10, books.isbn10),
    edition_key = COALESCE(excluded.edition_key, books.edition_key),
    title = excluded.title,
    subtitle = COALESCE(excluded.subtitle, books.subtitle),
    authors_json = excluded.authors_json,
    publisher = COALESCE(excluded.publisher, books.publisher),
    published_date = COALESCE(excluded.published_date, books.published_date),
    publication_year = COALESCE(excluded.publication_year, books.publication_year),
    primary_genre = CASE WHEN books.primary_genre = 'Uncategorized' THEN excluded.primary_genre ELSE books.primary_genre END,
    categories_json = excluded.categories_json,
    language = COALESCE(excluded.language, books.language),
    page_count = COALESCE(excluded.page_count, books.page_count),
    description = COALESCE(excluded.description, books.description),
    cover_url = COALESCE(excluded.cover_url, books.cover_url),
    average_rating = excluded.average_rating,
    ratings_count = excluded.ratings_count,
    rating_dist_json = COALESCE(excluded.rating_dist_json, books.rating_dist_json),
    preview_link = COALESCE(excluded.preview_link, books.preview_link),
    info_link = COALESCE(excluded.info_link, books.info_link),
    source_url = excluded.source_url,
    fetched_at = excluded.fetched_at
`);

export function upsertBooks(books: BookRecord[]): void {
  db.exec('BEGIN');
  try {
    for (const b of books) {
      upsertStmt.run(
        b.id,
        b.sourceItemId,
        b.dataSource,
        b.isbn13,
        b.isbn10,
        b.editionKey,
        b.title,
        b.subtitle,
        JSON.stringify(b.authors),
        b.publisher,
        b.publishedDate,
        b.publicationYear,
        b.primaryGenre,
        JSON.stringify(b.categories),
        b.language,
        b.pageCount,
        b.description,
        b.coverUrl,
        b.averageRating,
        b.ratingsCount,
        b.ratingDistribution ? JSON.stringify(b.ratingDistribution) : null,
        b.previewLink,
        b.infoLink,
        b.sourceUrl,
        b.fetchedAt
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export interface BookFilterParams {
  q?: string;
  searchType?: 'all' | 'title' | 'author' | 'isbn' | 'genre';
  genre?: string;
  source?: string;
  author?: string;
  language?: string;
  yearMin?: number | null;
  yearMax?: number | null;
  minRating?: number | null;
  minRatingCount?: number | null;
}

export function queryBooks(filters: BookFilterParams = {}): BookRecord[] {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.source && filters.source !== 'all') {
    clauses.push('data_source = ?');
    params.push(filters.source);
  }

  if (filters.genre && filters.genre !== 'all') {
    clauses.push('primary_genre = ?');
    params.push(filters.genre);
  }

  if (filters.language && filters.language !== 'all') {
    clauses.push('LOWER(language) = LOWER(?)');
    params.push(filters.language);
  }

  if (filters.author && filters.author.trim().length > 0) {
    clauses.push('LOWER(authors_json) LIKE LOWER(?)');
    params.push(`%${filters.author.trim()}%`);
  }

  if (typeof filters.yearMin === 'number' && Number.isFinite(filters.yearMin)) {
    clauses.push('publication_year IS NOT NULL AND publication_year >= ?');
    params.push(filters.yearMin);
  }

  if (typeof filters.yearMax === 'number' && Number.isFinite(filters.yearMax)) {
    clauses.push('publication_year IS NOT NULL AND publication_year <= ?');
    params.push(filters.yearMax);
  }

  if (typeof filters.minRating === 'number' && Number.isFinite(filters.minRating) && filters.minRating > 0) {
    clauses.push('average_rating IS NOT NULL AND average_rating >= ?');
    params.push(filters.minRating);
  }

  if (
    typeof filters.minRatingCount === 'number' &&
    Number.isFinite(filters.minRatingCount) &&
    filters.minRatingCount > 0
  ) {
    clauses.push('ratings_count IS NOT NULL AND ratings_count >= ?');
    params.push(filters.minRatingCount);
  }

  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    const type = filters.searchType ?? 'all';
    if (type === 'title') {
      clauses.push("(LOWER(title) LIKE LOWER(?) OR LOWER(COALESCE(subtitle, '')) LIKE LOWER(?))");
      params.push(term, term);
    } else if (type === 'author') {
      clauses.push('LOWER(authors_json) LIKE LOWER(?)');
      params.push(term);
    } else if (type === 'isbn') {
      const cleaned = `%${filters.q.replace(/[^0-9Xx]/g, '')}%`;
      clauses.push("(REPLACE(COALESCE(isbn13, ''), '-', '') LIKE ? OR REPLACE(COALESCE(isbn10, ''), '-', '') LIKE ?)");
      params.push(cleaned, cleaned);
    } else if (type === 'genre') {
      clauses.push('(LOWER(primary_genre) LIKE LOWER(?) OR LOWER(categories_json) LIKE LOWER(?))');
      params.push(term, term);
    } else {
      clauses.push(
        "(LOWER(title) LIKE LOWER(?) OR LOWER(COALESCE(subtitle, '')) LIKE LOWER(?) OR LOWER(authors_json) LIKE LOWER(?) OR LOWER(primary_genre) LIKE LOWER(?) OR COALESCE(isbn13, '') LIKE ? OR COALESCE(isbn10, '') LIKE ?)"
      );
      params.push(term, term, term, term, term, term);
    }
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM books ${whereSql} ORDER BY fetched_at DESC`);
  const rows = stmt.all(...params) as unknown as RawBookRow[];
  return rows.map(rowToBook);
}

export function getBookById(id: string): BookRecord | null {
  const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
  const row = stmt.get(id) as unknown as RawBookRow | undefined;
  return row ? rowToBook(row) : null;
}

export function updateBookDescription(id: string, description: string): void {
  const stmt = db.prepare('UPDATE books SET description = ? WHERE id = ?');
  stmt.run(description, id);
}

export function getFilterFacets(): {
  genres: string[];
  languages: string[];
  sources: DataSourceName[];
  minYear: number | null;
  maxYear: number | null;
  totalCount: number;
} {
  const genresRows = db
    .prepare('SELECT DISTINCT primary_genre FROM books WHERE primary_genre IS NOT NULL ORDER BY primary_genre ASC')
    .all() as Array<{ primary_genre: string }>;
  const langRows = db
    .prepare("SELECT DISTINCT language FROM books WHERE language IS NOT NULL AND language != '' ORDER BY language ASC")
    .all() as Array<{ language: string }>;
  const sourceRows = db
    .prepare('SELECT DISTINCT data_source FROM books ORDER BY data_source ASC')
    .all() as Array<{ data_source: DataSourceName }>;
  const bounds = db
    .prepare('SELECT MIN(publication_year) as minYear, MAX(publication_year) as maxYear, COUNT(*) as totalCount FROM books')
    .get() as { minYear: number | null; maxYear: number | null; totalCount: number };

  return {
    genres: genresRows.map((r) => r.primary_genre),
    languages: langRows.map((r) => r.language),
    sources: sourceRows.map((r) => r.data_source),
    minYear: bounds?.minYear ?? null,
    maxYear: bounds?.maxYear ?? null,
    totalCount: bounds?.totalCount ?? 0,
  };
}

export function getSourceCounts(): { googleBooks: number; openLibrary: number; total: number; lastUpdatedAt: string | null } {
  const rows = db
    .prepare('SELECT data_source, COUNT(*) as c, MAX(fetched_at) as lastFetched FROM books GROUP BY data_source')
    .all() as Array<{ data_source: string; c: number; lastFetched: string | null }>;
  let googleBooks = 0;
  let openLibrary = 0;
  let lastUpdatedAt: string | null = null;
  for (const r of rows) {
    if (r.data_source === 'Google Books API') googleBooks = r.c;
    if (r.data_source === 'Open Library API') openLibrary = r.c;
    if (r.lastFetched && (!lastUpdatedAt || r.lastFetched > lastUpdatedAt)) {
      lastUpdatedAt = r.lastFetched;
    }
  }
  return { googleBooks, openLibrary, total: googleBooks + openLibrary, lastUpdatedAt };
}

export function getCachedResponse<T>(cacheKey: string): T | null {
  const now = Date.now();
  const row = db
    .prepare('SELECT response_json, expires_at FROM api_cache WHERE cache_key = ?')
    .get(cacheKey) as { response_json: string; expires_at: number } | undefined;
  if (!row || row.expires_at < now) return null;
  try {
    return JSON.parse(row.response_json) as T;
  } catch {
    return null;
  }
}

export function setCachedResponse(cacheKey: string, provider: string, data: unknown, ttlMs = 1000 * 60 * 60 * 12): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO api_cache (cache_key, provider, response_json, fetched_at, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       response_json = excluded.response_json,
       fetched_at = excluded.fetched_at,
       expires_at = excluded.expires_at`
  ).run(cacheKey, provider, JSON.stringify(data), now, now + ttlMs);
}

export function recordSearchHistory(
  query: string,
  searchType: string,
  source: string,
  resultCount: number
): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  db.prepare(
    'DELETE FROM search_history WHERE LOWER(query) = LOWER(?) AND search_type = ? AND source = ?'
  ).run(trimmed, searchType, source);
  db.prepare(
    'INSERT INTO search_history (query, search_type, source, result_count, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(trimmed, searchType, source, resultCount, new Date().toISOString());
  db.prepare(
    'DELETE FROM search_history WHERE id NOT IN (SELECT id FROM search_history ORDER BY id DESC LIMIT 15)'
  ).run();
}

export function getSearchHistory(): SearchHistoryEntry[] {
  const rows = db
    .prepare('SELECT id, query, search_type, source, result_count, created_at FROM search_history ORDER BY id DESC LIMIT 12')
    .all() as Array<{
      id: number;
      query: string;
      search_type: string;
      source: string;
      result_count: number;
      created_at: string;
    }>;
  return rows.map((r) => ({
    id: r.id,
    query: r.query,
    searchType: r.search_type,
    source: r.source,
    resultCount: r.result_count,
    createdAt: r.created_at,
  }));
}

export function clearSearchHistory(): void {
  db.prepare('DELETE FROM search_history').run();
}

export function getSearchSuggestions(prefix: string): Array<{ label: string; type: 'title' | 'author' | 'genre'; bookId?: string }> {
  const trimmed = prefix.trim();
  if (trimmed.length < 2) return [];
  const like = `%${trimmed}%`;

  const titles = db
    .prepare('SELECT id, title FROM books WHERE LOWER(title) LIKE LOWER(?) ORDER BY COALESCE(ratings_count, 0) DESC LIMIT 5')
    .all(like) as Array<{ id: string; title: string }>;

  const genres = db
    .prepare('SELECT DISTINCT primary_genre FROM books WHERE LOWER(primary_genre) LIKE LOWER(?) LIMIT 3')
    .all(like) as Array<{ primary_genre: string }>;

  const authorRows = db
    .prepare('SELECT authors_json FROM books WHERE LOWER(authors_json) LIKE LOWER(?) LIMIT 10')
    .all(like) as Array<{ authors_json: string }>;

  const authorSet = new Set<string>();
  const lowerPrefix = trimmed.toLowerCase();
  for (const r of authorRows) {
    try {
      const list = JSON.parse(r.authors_json) as string[];
      for (const a of list) {
        if (a.toLowerCase().includes(lowerPrefix)) {
          authorSet.add(a);
          if (authorSet.size >= 4) break;
        }
      }
    } catch {
      // ignore malformed json
    }
    if (authorSet.size >= 4) break;
  }

  return [
    ...titles.map((t) => ({ label: t.title, type: 'title' as const, bookId: t.id })),
    ...Array.from(authorSet).map((a) => ({ label: a, type: 'author' as const })),
    ...genres.map((g) => ({ label: g.primary_genre, type: 'genre' as const })),
  ].slice(0, 9);
}
