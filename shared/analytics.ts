import type {
  AnalyticsPayload,
  AnalyticsSummary,
  BookRecord,
  BookWithScore,
  DataSourceName,
  GenreMetric,
  RatingBinMetric,
  RecommendationsPayload,
  ReportPayload,
  YearTrendMetric,
} from './types.ts';

/**
 * Computes unweighted arithmetic mean of average ratings across books that have a real averageRating.
 * Books without a rating (averageRating === null) are strictly excluded.
 */
export function computeUnweightedAverage(books: BookRecord[]): number | null {
  const rated = books.filter(
    (b) => typeof b.averageRating === 'number' && Number.isFinite(b.averageRating) && b.averageRating > 0
  );
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, b) => acc + (b.averageRating as number), 0);
  return round4(sum / rated.length);
}

/**
 * Computes weighted average rating across all individual ratings:
 * Weighted Average = Sum(averageRating_i * ratingsCount_i) / Sum(ratingsCount_i)
 * Strictly excludes books missing either averageRating or positive ratingsCount.
 */
export function computeWeightedAverage(books: BookRecord[]): number | null {
  let weightedSum = 0;
  let totalVotes = 0;
  for (const b of books) {
    if (
      typeof b.averageRating === 'number' &&
      Number.isFinite(b.averageRating) &&
      b.averageRating > 0 &&
      typeof b.ratingsCount === 'number' &&
      Number.isFinite(b.ratingsCount) &&
      b.ratingsCount > 0
    ) {
      weightedSum += b.averageRating * b.ratingsCount;
      totalVotes += b.ratingsCount;
    }
  }
  if (totalVotes === 0) return null;
  return round4(weightedSum / totalVotes);
}

/**
 * Bayesian Weighted Rating (Confidence-Aware Ranking Score):
 * W = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * Where:
 *   R = Book's genuine average rating
 *   v = Book's genuine number of ratings
 *   C = Mean rating across eligible rated books in the dataset
 *   m = Minimum rating count threshold for statistical confidence
 */
export function computeBayesianScore(
  R: number | null,
  v: number | null,
  C: number | null,
  m: number
): number | null {
  if (
    R === null ||
    v === null ||
    C === null ||
    !Number.isFinite(R) ||
    !Number.isFinite(v) ||
    v <= 0 ||
    m < 0
  ) {
    return null;
  }
  const score = (v / (v + m)) * R + (m / (v + m)) * C;
  return round4(score);
}

export function attachBayesianScores(
  books: BookRecord[],
  m: number,
  basisPrefix?: string
): { scored: BookWithScore[]; globalMeanC: number | null } {
  const globalMeanC = computeUnweightedAverage(books);
  const scored: BookWithScore[] = books.map((book) => {
    const bayesianScore = computeBayesianScore(
      book.averageRating,
      book.ratingsCount,
      globalMeanC,
      m
    );
    const rankingBasis =
      bayesianScore !== null && globalMeanC !== null
        ? `${basisPrefix ? `${basisPrefix} — ` : ''}Bayesian score (m=${m}, C=${globalMeanC.toFixed(2)}) combining ${book.averageRating?.toFixed(2)} avg over ${book.ratingsCount?.toLocaleString()} ratings`
        : 'Not eligible for Bayesian scoring (missing genuine rating or rating count)';
    return {
      ...book,
      bayesianScore,
      rankingBasis,
    };
  });
  return { scored, globalMeanC };
}

export function computeSummary(books: BookRecord[]): AnalyticsSummary {
  const ratedBooks = books.filter(
    (b) => b.averageRating !== null && b.ratingsCount !== null && b.ratingsCount > 0
  );
  const totalRatings = ratedBooks.reduce((acc, b) => acc + (b.ratingsCount ?? 0), 0);

  const genres = new Set(books.map((b) => b.primaryGenre).filter(Boolean));
  const validYears = books
    .map((b) => b.publicationYear)
    .filter((y): y is number => typeof y === 'number' && y >= 1450 && y <= 2026);

  const sources: DataSourceName[] = ['Google Books API', 'Open Library API'];
  const sourcesBreakdown = sources
    .map((source) => {
      const subset = books.filter((b) => b.dataSource === source);
      const subsetRated = subset.filter(
        (b) => b.averageRating !== null && b.ratingsCount !== null && b.ratingsCount > 0
      );
      return {
        source,
        bookCount: subset.length,
        ratedBookCount: subsetRated.length,
        totalRatings: subsetRated.reduce((acc, b) => acc + (b.ratingsCount ?? 0), 0),
        unweightedAvgRating: computeUnweightedAverage(subset),
        weightedAvgRating: computeWeightedAverage(subset),
      };
    })
    .filter((s) => s.bookCount > 0);

  return {
    totalBooks: books.length,
    ratedBooks: ratedBooks.length,
    unratedBooks: books.length - ratedBooks.length,
    totalRatings,
    genreCount: genres.size,
    unweightedAverageRating: computeUnweightedAverage(books),
    weightedAverageRating: computeWeightedAverage(books),
    booksWithValidYear: validYears.length,
    booksExcludedFromYearAnalysis: books.length - validYears.length,
    minYear: validYears.length > 0 ? Math.min(...validYears) : null,
    maxYear: validYears.length > 0 ? Math.max(...validYears) : null,
    sourcesBreakdown,
  };
}

/**
 * Genre metrics are computed strictly from each book's single normalized primaryGenre
 * to guarantee zero double-counting of ratings in aggregate statistics.
 */
export function computeGenreMetrics(books: BookRecord[], minThresholdM = 50): GenreMetric[] {
  const byGenre = new Map<string, BookRecord[]>();
  for (const book of books) {
    const genre = book.primaryGenre || 'Uncategorized';
    const arr = byGenre.get(genre) ?? [];
    arr.push(book);
    byGenre.set(genre, arr);
  }

  const globalC = computeUnweightedAverage(books);
  const metrics: GenreMetric[] = [];

  for (const [genre, list] of byGenre.entries()) {
    const rated = list.filter(
      (b) => b.averageRating !== null && b.ratingsCount !== null && b.ratingsCount > 0
    );
    const totalRatings = rated.reduce((acc, b) => acc + (b.ratingsCount ?? 0), 0);

    // Determine top book in genre by Bayesian score
    let topBook: BookRecord | null = null;
    let bestScore = -1;
    for (const b of rated) {
      const score = computeBayesianScore(b.averageRating, b.ratingsCount, globalC, minThresholdM);
      if (score !== null && score > bestScore) {
        bestScore = score;
        topBook = b;
      }
    }

    metrics.push({
      genre,
      bookCount: list.length,
      ratedBookCount: rated.length,
      totalRatings,
      unweightedAvgRating: computeUnweightedAverage(list),
      weightedAvgRating: computeWeightedAverage(list),
      topBookTitle: topBook ? topBook.title : null,
      topBookId: topBook ? topBook.id : null,
      topBookRating: topBook ? topBook.averageRating : null,
      topBookRatingsCount: topBook ? topBook.ratingsCount : null,
    });
  }

  return metrics.sort((a, b) => b.totalRatings - a.totalRatings || b.bookCount - a.bookCount);
}

/**
 * Computes publication-year trends strictly over books with a valid extracted 4-digit year.
 */
export function computeYearTrends(books: BookRecord[]): YearTrendMetric[] {
  const byYear = new Map<number, BookRecord[]>();
  for (const book of books) {
    if (
      typeof book.publicationYear === 'number' &&
      book.publicationYear >= 1450 &&
      book.publicationYear <= 2026
    ) {
      const arr = byYear.get(book.publicationYear) ?? [];
      arr.push(book);
      byYear.set(book.publicationYear, arr);
    }
  }

  const trends: YearTrendMetric[] = [];
  for (const [year, list] of byYear.entries()) {
    const rated = list.filter(
      (b) => b.averageRating !== null && b.ratingsCount !== null && b.ratingsCount > 0
    );
    trends.push({
      year,
      bookCount: list.length,
      ratedBookCount: rated.length,
      totalRatings: rated.reduce((acc, b) => acc + (b.ratingsCount ?? 0), 0),
      unweightedAvgRating: computeUnweightedAverage(list),
      weightedAvgRating: computeWeightedAverage(list),
    });
  }

  return trends.sort((a, b) => a.year - b.year);
}

export function computeRatingBins(books: BookRecord[]): RatingBinMetric[] {
  const bins: RatingBinMetric[] = [
    { range: '1.0 – 1.99', min: 1.0, max: 2.0, bookCount: 0 },
    { range: '2.0 – 2.99', min: 2.0, max: 3.0, bookCount: 0 },
    { range: '3.0 – 3.49', min: 3.0, max: 3.5, bookCount: 0 },
    { range: '3.5 – 3.99', min: 3.5, max: 4.0, bookCount: 0 },
    { range: '4.0 – 4.49', min: 4.0, max: 4.5, bookCount: 0 },
    { range: '4.5 – 5.00', min: 4.5, max: 5.01, bookCount: 0 },
  ];

  for (const b of books) {
    if (b.averageRating === null || b.averageRating < 1) continue;
    for (const bin of bins) {
      if (b.averageRating >= bin.min && b.averageRating < bin.max) {
        bin.bookCount += 1;
        break;
      }
    }
  }
  return bins;
}

export function buildAnalyticsPayload(
  books: BookRecord[],
  minRatingCountThreshold = 50
): AnalyticsPayload {
  const summary = computeSummary(books);
  const { scored, globalMeanC } = attachBayesianScores(books, minRatingCountThreshold);
  const genreMetrics = computeGenreMetrics(books, minRatingCountThreshold);
  const yearTrends = computeYearTrends(books);
  const ratingDistribution = computeRatingBins(books);

  const ratedScored = scored.filter(
    (b) => b.averageRating !== null && b.ratingsCount !== null && b.ratingsCount > 0
  );

  const mostRatedBooks = [...ratedScored]
    .sort((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0))
    .slice(0, 12);

  const highestRatedBooks = [...ratedScored]
    .filter((b) => (b.ratingsCount ?? 0) >= minRatingCountThreshold)
    .sort((a, b) => {
      const avgDiff = (b.averageRating ?? 0) - (a.averageRating ?? 0);
      if (Math.abs(avgDiff) > 0.0001) return avgDiff;
      return (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0);
    })
    .slice(0, 12);

  return {
    summary,
    genreMetrics,
    yearTrends,
    ratingDistribution,
    mostRatedBooks,
    highestRatedBooks,
    minRatingCountApplied: minRatingCountThreshold,
    bayesianGlobalMeanC: globalMeanC,
  };
}

export function buildRecommendationsPayload(
  books: BookRecord[],
  minThresholdM = 50
): RecommendationsPayload {
  const safeM = Math.max(1, Math.min(5000, Math.round(minThresholdM)));
  const { scored, globalMeanC } = attachBayesianScores(books, safeM);
  const eligible = scored.filter(
    (b) => b.averageRating !== null && b.ratingsCount !== null && b.ratingsCount > 0
  );

  // 1. Highly Rated: Bayesian confidence-adjusted score among books meeting >= m threshold
  let highlyRatedPool = eligible.filter((b) => (b.ratingsCount ?? 0) >= safeM);
  const meetsFullThreshold = highlyRatedPool.length > 0;
  if (!meetsFullThreshold) {
    highlyRatedPool = eligible;
  }
  const highlyRated = [...highlyRatedPool]
    .sort((a, b) => (b.bayesianScore ?? 0) - (a.bayesianScore ?? 0))
    .slice(0, 12)
    .map((b) => ({
      ...b,
      rankingBasis: meetsFullThreshold
        ? `Ranked by Bayesian confidence score (m=${safeM}, C=${globalMeanC?.toFixed(2) ?? 'N/A'}) among books with >= ${safeM} genuine ratings`
        : `Ranked by Bayesian confidence score (m=${safeM}); no book met >= ${safeM} ratings, showing highest-confidence available books`,
    }));

  // 2. Most Popular: Strictly highest genuine rating count
  const mostPopular = [...eligible]
    .sort((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0))
    .slice(0, 12)
    .map((b) => ({
      ...b,
      rankingBasis: `Ranked by highest total rating volume (${b.ratingsCount?.toLocaleString()} genuine user ratings from ${b.dataSource})`,
    }));

  // 3. Hidden Gems: Transparent explicit statistical rule
  const gemMinCount = Math.max(5, Math.min(25, Math.round(safeM * 0.25)));
  const gemMaxCount = Math.max(gemMinCount + 20, Math.min(250, safeM * 2));
  const gemMinRating = 4.05;

  const hiddenGems = [...eligible]
    .filter(
      (b) =>
        (b.averageRating ?? 0) >= gemMinRating &&
        (b.ratingsCount ?? 0) >= gemMinCount &&
        (b.ratingsCount ?? 0) <= gemMaxCount
    )
    .sort((a, b) => (b.bayesianScore ?? 0) - (a.bayesianScore ?? 0))
    .slice(0, 12)
    .map((b) => ({
      ...b,
      rankingBasis: `Hidden Gem criteria: rating >= ${gemMinRating.toFixed(2)} with ${gemMinCount}–${gemMaxCount} ratings (sufficient signal below mainstream volume), ordered by Bayesian score`,
    }));

  // 4. Recently Published: Valid publication year >= 2018
  const cutoffYear = 2018;
  const recentlyPublished = [...eligible]
    .filter((b) => b.publicationYear !== null && b.publicationYear >= cutoffYear)
    .sort((a, b) => (b.bayesianScore ?? 0) - (a.bayesianScore ?? 0))
    .slice(0, 12)
    .map((b) => ({
      ...b,
      rankingBasis: `Published in ${b.publicationYear} (>= ${cutoffYear} cutoff), ordered by Bayesian confidence score (m=${safeM})`,
    }));

  // 5. Best in Genre: Top Bayesian-scored book per primary genre
  const byGenre = new Map<string, BookWithScore[]>();
  for (const b of eligible) {
    const arr = byGenre.get(b.primaryGenre) ?? [];
    arr.push(b);
    byGenre.set(b.primaryGenre, arr);
  }
  const bestInGenre = Array.from(byGenre.entries())
    .map(([genre, list]) => {
      const aboveM = list.filter((b) => (b.ratingsCount ?? 0) >= safeM);
      const pool = aboveM.length > 0 ? aboveM : list;
      const top = [...pool].sort((a, b) => (b.bayesianScore ?? 0) - (a.bayesianScore ?? 0))[0];
      return {
        genre,
        genreBookCount: list.length,
        book: {
          ...top,
          rankingBasis:
            aboveM.length > 0
              ? `Top Bayesian-scored title in ${genre} meeting >= ${safeM} ratings threshold`
              : `Top Bayesian-scored title in ${genre} (note: no title in ${genre} reached ${safeM} ratings; sample size = ${top.ratingsCount})`,
        },
      };
    })
    .sort((a, b) => (b.book.bayesianScore ?? 0) - (a.book.bayesianScore ?? 0));

  return {
    bayesianGlobalMeanC: globalMeanC,
    minThresholdM: safeM,
    eligibleBookCount: eligible.length,
    hiddenGemsCriteria: {
      minRating: gemMinRating,
      minCount: gemMinCount,
      maxCount: gemMaxCount,
      description: `Books with an authentic average rating of at least ${gemMinRating.toFixed(2)} and between ${gemMinCount} and ${gemMaxCount} ratings, ranked by Bayesian confidence score.`,
    },
    recentlyPublishedCutoffYear: cutoffYear,
    categories: {
      highlyRated,
      mostPopular,
      hiddenGems,
      recentlyPublished,
      bestInGenre,
    },
  };
}

export function buildReportPayload(
  books: BookRecord[],
  appliedFilters: ReportPayload['appliedFilters']
): ReportPayload {
  const analytics = buildAnalyticsPayload(books, appliedFilters.minRatingCount);
  const { scored } = attachBayesianScores(books, appliedFilters.minRatingCount);

  const genresWithRatings = analytics.genreMetrics.filter((g) => g.totalRatings > 0);
  const mostPopularGenre =
    genresWithRatings.length > 0
      ? [...genresWithRatings].sort((a, b) => b.totalRatings - a.totalRatings)[0]
      : null;

  const eligibleGenresForTopAvg = genresWithRatings.filter((g) => g.ratedBookCount >= 2);
  const genrePoolForTopAvg =
    eligibleGenresForTopAvg.length > 0 ? eligibleGenresForTopAvg : genresWithRatings;
  const highestRatedGenre =
    genrePoolForTopAvg.length > 0
      ? [...genrePoolForTopAvg].sort(
          (a, b) => (b.weightedAvgRating ?? 0) - (a.weightedAvgRating ?? 0)
        )[0]
      : null;

  const mostRatedBook = analytics.mostRatedBooks[0] ?? null;

  // Strictly empirical, computed observations — zero fabricated statements
  const observations: string[] = [];
  const { summary } = analytics;

  if (summary.totalBooks > 0) {
    const ratedPct = ((summary.ratedBooks / summary.totalBooks) * 100).toFixed(1);
    observations.push(
      `Of ${summary.totalBooks.toLocaleString()} books analyzed across ${summary.genreCount} normalized genre categories, ${summary.ratedBooks.toLocaleString()} (${ratedPct}%) have genuine user ratings totaling ${summary.totalRatings.toLocaleString()} individual ratings; ${summary.unratedBooks.toLocaleString()} unrated titles were preserved as "Not Rated" and excluded from rating averages.`
    );
  }

  if (summary.unweightedAverageRating !== null && summary.weightedAverageRating !== null) {
    const delta = summary.weightedAverageRating - summary.unweightedAverageRating;
    const direction =
      Math.abs(delta) < 0.005
        ? 'nearly identical to'
        : delta > 0
          ? `${delta.toFixed(2)} points higher than`
          : `${Math.abs(delta).toFixed(2)} points lower than`;
    observations.push(
      `The volume-weighted average rating (${summary.weightedAverageRating.toFixed(2)}/5.00) is ${direction} the unweighted mean across books (${summary.unweightedAverageRating.toFixed(2)}/5.00), illustrating how heavily rated titles influence overall reader sentiment.`
    );
  }

  if (mostPopularGenre) {
    const share =
      summary.totalRatings > 0
        ? ((mostPopularGenre.totalRatings / summary.totalRatings) * 100).toFixed(1)
        : '0.0';
    observations.push(
      `${mostPopularGenre.genre} accounts for the largest share of reader engagement with ${mostPopularGenre.totalRatings.toLocaleString()} ratings (${share}% of total collected ratings) across ${mostPopularGenre.bookCount} books.`
    );
  }

  if (highestRatedGenre && highestRatedGenre.weightedAvgRating !== null) {
    observations.push(
      `${highestRatedGenre.genre} achieves the highest weighted average rating at ${highestRatedGenre.weightedAvgRating.toFixed(2)}/5.00 across ${highestRatedGenre.ratedBookCount} rated titles (${highestRatedGenre.totalRatings.toLocaleString()} total ratings).`
    );
  }

  if (mostRatedBook && mostRatedBook.averageRating !== null && mostRatedBook.ratingsCount !== null) {
    observations.push(
      `The single most rated title in the active dataset is "${mostRatedBook.title}" with ${mostRatedBook.ratingsCount.toLocaleString()} ratings and an average rating of ${mostRatedBook.averageRating.toFixed(2)}/5.00 (Source: ${mostRatedBook.dataSource}).`
    );
  }

  if (summary.booksExcludedFromYearAnalysis > 0) {
    observations.push(
      `Publication-year trend analysis spans ${summary.minYear ?? 'N/A'}–${summary.maxYear ?? 'N/A'} across ${summary.booksWithValidYear.toLocaleString()} books; ${summary.booksExcludedFromYearAnalysis.toLocaleString()} books lacking a verified 4-digit publication year were excluded without estimation.`
    );
  } else if (summary.minYear !== null && summary.maxYear !== null) {
    observations.push(
      `All ${summary.booksWithValidYear.toLocaleString()} analyzed books carry verified publication years spanning ${summary.minYear} to ${summary.maxYear}.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    projectMetadata: {
      projectName: 'Book Rating Analysis',
      projectType: 'Data Science Mini Project',
      studentName: 'Sarvagya Jain',
      projectId: '122042',
      academicYear: '2026',
      section: 'B2',
    },
    appliedFilters,
    summary,
    mostPopularGenre,
    highestRatedGenre,
    mostRatedBook,
    highestRatedBooks: analytics.highestRatedBooks,
    genreComparison: analytics.genreMetrics,
    yearTrends: analytics.yearTrends,
    observations,
    books: scored,
  };
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
