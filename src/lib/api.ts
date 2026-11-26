import type {
  AnalyticsPayload,
  BookWithScore,
  DataSourceName,
  ProviderStatus,
  RecommendationsPayload,
  ReportPayload,
  SearchHistoryEntry,
} from '../../shared/types.ts';

export interface FacetsResponse {
  genres: string[];
  languages: string[];
  sources: DataSourceName[];
  minYear: number | null;
  maxYear: number | null;
  totalCount: number;
}

export interface BooksListResponse {
  items: BookWithScore[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: FacetsResponse;
  bayesianGlobalMeanC: number | null;
}

export interface LiveSearchResponse {
  query: string;
  searchType: string;
  provider: string;
  books: BookWithScore[];
  totalRemoteItems: number;
  providerErrors: Array<{ provider: string; message: string; statusCode?: number }>;
}

export interface BookDetailResponse {
  book: BookWithScore;
  bayesianGlobalMeanC: number | null;
  bayesianThresholdM: number;
}

export interface SuggestionItem {
  label: string;
  type: 'title' | 'author' | 'genre';
  bookId?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  const contentType = resp.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await resp.json() : null;
  if (!resp.ok) {
    const msg =
      (data && typeof data.error === 'string' ? data.error : null) ||
      `Request failed with status ${resp.status}`;
    throw new Error(msg);
  }
  return data as T;
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export const api = {
  getStatus: () => fetchJson<ProviderStatus>('/api/status'),

  triggerCollect: () =>
    fetchJson<{ collected: number; errors: string[]; totalCachedBooks: number }>('/api/collect', {
      method: 'POST',
    }),

  getBooks: (params: {
    q?: string;
    searchType?: string;
    genre?: string;
    source?: string;
    author?: string;
    language?: string;
    yearMin?: number | null;
    yearMax?: number | null;
    minRating?: number | null;
    minRatingCount?: number | null;
    sort?: string;
    page?: number;
    limit?: number;
    m?: number;
  }) => fetchJson<BooksListResponse>(`/api/books${buildQuery(params)}`),

  getBookById: (id: string) =>
    fetchJson<BookDetailResponse>(`/api/books/${encodeURIComponent(id)}`),

  searchLive: (params: {
    q: string;
    searchType?: string;
    provider?: 'google' | 'openlibrary' | 'both';
  }) => fetchJson<LiveSearchResponse>(`/api/search/live${buildQuery(params)}`),

  getSuggestions: (q: string) =>
    fetchJson<{ suggestions: SuggestionItem[] }>(`/api/search/suggestions${buildQuery({ q })}`),

  getSearchHistory: () =>
    fetchJson<{ history: SearchHistoryEntry[] }>('/api/search/history'),

  clearSearchHistory: () =>
    fetchJson<{ cleared: boolean }>('/api/search/history', { method: 'DELETE' }),

  getAnalytics: (params: {
    source?: string;
    genre?: string;
    yearMin?: number | null;
    yearMax?: number | null;
    minRatingCount?: number;
  }) =>
    fetchJson<AnalyticsPayload & { facets: FacetsResponse }>(
      `/api/analytics${buildQuery(params)}`
    ),

  getRecommendations: (params: {
    source?: string;
    genre?: string;
    language?: string;
    m?: number;
  }) =>
    fetchJson<RecommendationsPayload & { facets: FacetsResponse }>(
      `/api/recommendations${buildQuery(params)}`
    ),

  getReport: (params: {
    source?: string;
    genre?: string;
    yearMin?: number | null;
    yearMax?: number | null;
    minRatingCount?: number;
  }) => fetchJson<ReportPayload>(`/api/report${buildQuery(params)}`),
};
