import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
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
import type { BookWithScore } from '../../shared/types.ts';
import { BookCover } from '../components/BookCover.tsx';
import { MetricTooltip } from '../components/MetricTooltip.tsx';

interface BookDetailsPageProps {
  bookId: string;
  onBack: () => void;
  onExploreGenre: (genre: string) => void;
}

export function BookDetailsPage({ bookId, onBack, onExploreGenre }: BookDetailsPageProps) {
  const [book, setBook] = useState<BookWithScore | null>(null);
  const [globalMeanC, setGlobalMeanC] = useState<number | null>(null);
  const [thresholdM, setThresholdM] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getBookById(bookId)
      .then((res) => {
        setBook(res.book);
        setGlobalMeanC(res.bayesianGlobalMeanC);
        setThresholdM(res.bayesianThresholdM);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load book details.');
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-[#172033]" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="h-96 animate-pulse rounded-lg bg-[#172033] md:col-span-4" />
          <div className="h-96 animate-pulse rounded-lg bg-[#172033] md:col-span-8" />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-serif text-2xl text-[#F5F1E8]">Book Record Unavailable</p>
        <p className="mt-2 text-sm text-[#A5ADBC]">{error ?? 'The requested volume was not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#C6A96B] px-4 py-2 text-xs font-semibold text-[#0B1020]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </button>
      </div>
    );
  }

  const authorText = book.authors.length > 0 ? book.authors.join(', ') : 'Not Available';
  const hasRating = book.averageRating !== null;
  const hasCount = book.ratingsCount !== null && book.ratingsCount > 0;
  const externalLink = book.previewLink || book.infoLink || book.sourceUrl;

  const distChartData = book.ratingDistribution
    ? ([5, 4, 3, 2, 1] as const).map((star) => {
        const count = book.ratingDistribution?.[star] ?? 0;
        const totalDist =
          (book.ratingDistribution?.[1] ?? 0) +
          (book.ratingDistribution?.[2] ?? 0) +
          (book.ratingDistribution?.[3] ?? 0) +
          (book.ratingDistribution?.[4] ?? 0) +
          (book.ratingDistribution?.[5] ?? 0);
        return {
          label: `${star} Star${star > 1 ? 's' : ''}`,
          count,
          percent: totalDist > 0 ? Number(((count / totalDist) * 100).toFixed(1)) : 0,
        };
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#A5ADBC] transition-colors hover:text-[#C6A96B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore Books
        </button>
      </div>

      {/* Main Details Split */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Cover & Official Link */}
        <div className="space-y-4 lg:col-span-4">
          <BookCover
            src={book.coverUrl}
            title={book.title}
            author={authorText}
            size="lg"
            className="mx-auto aspect-[3/4] max-w-xs w-full shadow-xl"
          />

          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto flex h-11 max-w-xs w-full items-center justify-center gap-2 rounded-md bg-[#C6A96B] px-4 text-sm font-semibold text-[#0B1020] transition-colors hover:bg-[#D5BD88]"
            >
              Open Official Book Page
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <p className="mx-auto max-w-xs text-center text-xs text-[#A5ADBC]">
            Edition ID: <span className="font-mono text-[#E8E1D3]">{book.editionKey ?? book.sourceItemId}</span>
          </p>
        </div>

        {/* Full Metadata & Rating Metrics */}
        <div className="space-y-8 lg:col-span-8">
          <div className="space-y-3 border-b border-[#F5F1E8]/10 pb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A5ADBC]">
              <button
                type="button"
                onClick={() => onExploreGenre(book.primaryGenre)}
                className="font-medium text-[#A7BFA3] hover:underline"
              >
                {book.primaryGenre}
              </button>
              <span aria-hidden="true">·</span>
              <span>Published {book.publishedDate ?? 'Not Available'}</span>
              <span aria-hidden="true">·</span>
              <span>Data Source: {book.dataSource}</span>
            </div>

            <h1 className="font-serif text-3xl font-semibold leading-tight text-[#F5F1E8] sm:text-4xl">
              {book.title}
            </h1>

            {book.subtitle && (
              <p className="text-lg text-[#E8E1D3]/85">{book.subtitle}</p>
            )}

            <p className="text-base text-[#A5ADBC]">
              By <span className="text-[#F5F1E8]">{authorText}</span>
            </p>
          </div>

          {/* Honest Rating Metrics Block */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-4">
              <p className="text-xs text-[#A5ADBC]">Original Average Rating</p>
              {hasRating ? (
                <div className="mt-2 flex items-baseline gap-1.5">
                  <Star className="h-4 w-4 fill-[#C6A96B] text-[#C6A96B] self-center" />
                  <span className="font-mono text-2xl font-semibold tabular-nums text-[#F5F1E8]">
                    {book.averageRating?.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#A5ADBC]">/ 5.00</span>
                </div>
              ) : (
                <p className="mt-2 text-lg font-medium text-[#A5ADBC]">Not Rated</p>
              )}
              <p className="mt-1.5 text-[11px] text-[#A5ADBC]">Source: {book.dataSource}</p>
            </div>

            <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-4">
              <p className="text-xs text-[#A5ADBC]">Total Rating Count</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#F5F1E8]">
                {hasCount ? book.ratingsCount?.toLocaleString() : 'No ratings available'}
              </p>
              <p className="mt-1.5 text-[11px] text-[#A5ADBC]">
                Edition-specific genuine ratings
              </p>
            </div>

            <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-4">
              <div className="flex items-center gap-1">
                <p className="text-xs text-[#A5ADBC]">Confidence-Adjusted Score</p>
                <MetricTooltip title="Bayesian Statistical Ranking">
                  <p>
                    Statistical ranking score W = (v/(v+m))×R + (m/(v+m))×C using m={thresholdM} and
                    dataset mean C={globalMeanC?.toFixed(2) ?? 'N/A'}.
                  </p>
                  <p>
                    This does not replace the official source rating; it guards against small-sample
                    bias.
                  </p>
                </MetricTooltip>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#A7BFA3]">
                {book.bayesianScore !== null ? book.bayesianScore.toFixed(3) : 'Not Eligible'}
              </p>
              <p className="mt-1.5 text-[11px] text-[#A5ADBC]">
                Statistical score (m={thresholdM})
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">Synopsis</h2>
            <p className="text-sm leading-relaxed text-[#E8E1D3]/90 whitespace-pre-line">
              {book.description ?? 'Not Available — The external source did not provide a description for this volume.'}
            </p>
          </div>

          {/* Bibliographic Metadata Table */}
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
              Edition &amp; Bibliographic Metadata
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-5 text-sm sm:grid-cols-2">
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">Publisher</dt>
                <dd className="mt-0.5 text-[#F5F1E8]">{book.publisher ?? 'Not Available'}</dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">Publication Date</dt>
                <dd className="mt-0.5 font-mono text-[#F5F1E8]">
                  {book.publishedDate ?? 'Not Available'}
                </dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">ISBN-13</dt>
                <dd className="mt-0.5 font-mono text-[#F5F1E8]">{book.isbn13 ?? 'Not Available'}</dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">ISBN-10</dt>
                <dd className="mt-0.5 font-mono text-[#F5F1E8]">{book.isbn10 ?? 'Not Available'}</dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">Language</dt>
                <dd className="mt-0.5 text-[#F5F1E8]">{book.language ?? 'Not Available'}</dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">Page Count</dt>
                <dd className="mt-0.5 font-mono text-[#F5F1E8]">
                  {book.pageCount !== null ? `${book.pageCount.toLocaleString()} pages` : 'Not Available'}
                </dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">Normalized Primary Genre</dt>
                <dd className="mt-0.5 text-[#A7BFA3]">{book.primaryGenre}</dd>
              </div>
              <div className="border-b border-[#F5F1E8]/5 pb-2">
                <dt className="text-xs text-[#A5ADBC]">Last Fetched</dt>
                <dd className="mt-0.5 font-mono text-xs text-[#E8E1D3]">
                  {new Date(book.fetchedAt).toLocaleString()}
                </dd>
              </div>
              {book.categories.length > 0 && (
                <div className="sm:col-span-2 pt-1">
                  <dt className="text-xs text-[#A5ADBC]">Source Subject Tags</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-[#E8E1D3]/85">
                    {book.categories.join(' · ')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Genuine Rating Distribution Chart OR Explicit Unavailable Message */}
          <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl font-semibold text-[#F5F1E8]">
                Star Rating Distribution
              </h2>
              <span className="text-xs text-[#A5ADBC]">Source: {book.dataSource}</span>
            </div>

            {distChartData ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,241,232,0.08)" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: '#A5ADBC', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(245,241,232,0.15)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={60}
                      tick={{ fill: '#E8E1D3', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(245,241,232,0.15)' }}
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
                      formatter={(value: unknown, _name: unknown, props: { payload?: { percent?: number } }) => [
                        `${Number(value).toLocaleString()} ratings (${props?.payload?.percent ?? 0}%)`,
                        'Count',
                      ]}
                    />
                    <Bar dataKey="count" fill="#C6A96B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-md border border-[#F5F1E8]/10 bg-[#0B1020]/60 px-4 py-6 text-center">
                <p className="text-sm text-[#E8E1D3]">
                  Rating distribution data is not available for this book.
                </p>
                <p className="mt-1 text-xs text-[#A5ADBC]">
                  To preserve data integrity, per-star breakdowns are never synthesized or estimated
                  when omitted by the source API.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
