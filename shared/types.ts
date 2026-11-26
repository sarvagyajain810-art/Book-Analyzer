export type DataSourceName = 'Google Books API' | 'Open Library API';

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface BookRecord {
  id: string;
  sourceItemId: string;
  dataSource: DataSourceName;
  isbn13: string | null;
  isbn10: string | null;
  editionKey: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  publicationYear: number | null;
  primaryGenre: string;
  categories: string[];
  language: string | null;
  pageCount: number | null;
  description: string | null;
  coverUrl: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
  ratingDistribution: RatingDistribution | null;
  previewLink: string | null;
  infoLink: string | null;
  sourceUrl: string;
  fetchedAt: string;
}

export interface BookWithScore extends BookRecord {
  bayesianScore: number | null;
  rankingBasis: string;
}

export interface GenreMetric {
  genre: string;
  bookCount: number;
  ratedBookCount: number;
  totalRatings: number;
  unweightedAvgRating: number | null;
  weightedAvgRating: number | null;
  topBookTitle: string | null;
  topBookId: string | null;
  topBookRating: number | null;
  topBookRatingsCount: number | null;
}

export interface YearTrendMetric {
  year: number;
  bookCount: number;
  ratedBookCount: number;
  totalRatings: number;
  unweightedAvgRating: number | null;
  weightedAvgRating: number | null;
}

export interface RatingBinMetric {
  range: string;
  min: number;
  max: number;
  bookCount: number;
}

export interface AnalyticsSummary {
  totalBooks: number;
  ratedBooks: number;
  unratedBooks: number;
  totalRatings: number;
  genreCount: number;
  unweightedAverageRating: number | null;
  weightedAverageRating: number | null;
  booksWithValidYear: number;
  booksExcludedFromYearAnalysis: number;
  minYear: number | null;
  maxYear: number | null;
  sourcesBreakdown: Array<{
    source: DataSourceName;
    bookCount: number;
    ratedBookCount: number;
    totalRatings: number;
    unweightedAvgRating: number | null;
    weightedAvgRating: number | null;
  }>;
}

export interface AnalyticsPayload {
  summary: AnalyticsSummary;
  genreMetrics: GenreMetric[];
  yearTrends: YearTrendMetric[];
  ratingDistribution: RatingBinMetric[];
  mostRatedBooks: BookWithScore[];
  highestRatedBooks: BookWithScore[];
  minRatingCountApplied: number;
  bayesianGlobalMeanC: number | null;
}

export interface RecommendationsPayload {
  bayesianGlobalMeanC: number | null;
  minThresholdM: number;
  eligibleBookCount: number;
  hiddenGemsCriteria: {
    minRating: number;
    minCount: number;
    maxCount: number;
    description: string;
  };
  recentlyPublishedCutoffYear: number;
  categories: {
    highlyRated: BookWithScore[];
    mostPopular: BookWithScore[];
    hiddenGems: BookWithScore[];
    recentlyPublished: BookWithScore[];
    bestInGenre: Array<{
      genre: string;
      book: BookWithScore;
      genreBookCount: number;
    }>;
  };
}

export interface ReportPayload {
  generatedAt: string;
  projectMetadata: {
    projectName: string;
    projectType: string;
    studentName: string;
    projectId: string;
    academicYear: string;
    section: string;
  };
  appliedFilters: {
    source: string;
    genre: string;
    yearMin: number | null;
    yearMax: number | null;
    minRatingCount: number;
  };
  summary: AnalyticsSummary;
  mostPopularGenre: GenreMetric | null;
  highestRatedGenre: GenreMetric | null;
  mostRatedBook: BookWithScore | null;
  highestRatedBooks: BookWithScore[];
  genreComparison: GenreMetric[];
  yearTrends: YearTrendMetric[];
  observations: string[];
  books: BookWithScore[];
}

export interface SearchHistoryEntry {
  id: number;
  query: string;
  searchType: string;
  source: string;
  resultCount: number;
  createdAt: string;
}

export interface ProviderStatus {
  googleBooks: {
    configuredWithApiKey: boolean;
    lastError: string | null;
    lastStatusCode: number | null;
    cachedBookCount: number;
  };
  openLibrary: {
    lastError: string | null;
    lastStatusCode: number | null;
    cachedBookCount: number;
  };
  isSeeding: boolean;
  totalCachedBooks: number;
  lastUpdatedAt: string | null;
}
