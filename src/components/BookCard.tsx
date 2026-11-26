import { ArrowUpRight, Star } from 'lucide-react';
import type { BookWithScore } from '../../shared/types.ts';
import { BookCover } from './BookCover.tsx';

interface BookCardProps {
  book: BookWithScore;
  viewMode?: 'grid' | 'list';
  showBayesianScore?: boolean;
  showRankingBasis?: boolean;
  onSelect: (bookId: string) => void;
}

export function BookCard({
  book,
  viewMode = 'grid',
  showBayesianScore = false,
  showRankingBasis = false,
  onSelect,
}: BookCardProps) {
  const authorLine = book.authors.length > 0 ? book.authors.join(', ') : 'Author Not Available';
  const hasRating = book.averageRating !== null;
  const hasCount = book.ratingsCount !== null && book.ratingsCount > 0;

  if (viewMode === 'list') {
    return (
      <article className="group flex flex-col gap-4 rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-4 transition-colors duration-200 hover:border-[#C6A96B]/40 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => onSelect(book.id)}
          className="shrink-0 text-left focus-visible:outline-2 focus-visible:outline-[#C6A96B]"
        >
          <BookCover
            src={book.coverUrl}
            title={book.title}
            author={authorLine}
            size="sm"
            className="h-32 w-22"
          />
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#A5ADBC]">
            <span className="text-[#A7BFA3]">{book.primaryGenre}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{book.publicationYear ?? 'Year Not Available'}</span>
            {book.language && (
              <>
                <span aria-hidden="true">·</span>
                <span>{book.language}</span>
              </>
            )}
          </div>

          <h3 className="font-serif text-lg font-medium leading-snug text-[#F5F1E8]">
            <button
              type="button"
              onClick={() => onSelect(book.id)}
              className="text-left transition-colors hover:text-[#C6A96B] focus-visible:outline-2 focus-visible:outline-[#C6A96B]"
            >
              {book.title}
            </button>
          </h3>

          <p className="text-sm text-[#A5ADBC] line-clamp-1">{authorLine}</p>

          {showRankingBasis && book.rankingBasis && (
            <p className="text-xs leading-relaxed text-[#A5ADBC]/90">{book.rankingBasis}</p>
          )}

          <p className="pt-1 text-[11px] text-[#A5ADBC]">
            Data Source: <span className="text-[#E8E1D3]">{book.dataSource}</span>
            {book.isbn13 && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono">ISBN {book.isbn13}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 border-t border-[#F5F1E8]/10 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
          <div className="text-left sm:text-right">
            {hasRating ? (
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Star className="h-4 w-4 fill-[#C6A96B] text-[#C6A96B]" aria-hidden="true" />
                <span className="font-mono text-base font-semibold tabular-nums text-[#F5F1E8]">
                  {book.averageRating?.toFixed(2)}
                </span>
                <span className="text-xs text-[#A5ADBC]">/ 5</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-[#A5ADBC]">Not Rated</p>
            )}

            <p className="mt-0.5 font-mono text-xs tabular-nums text-[#A5ADBC]">
              {hasCount ? `${book.ratingsCount?.toLocaleString()} ratings` : 'No ratings available'}
            </p>

            {showBayesianScore && book.bayesianScore !== null && (
              <p className="mt-1 font-mono text-xs tabular-nums text-[#A7BFA3]">
                Confidence Score: {book.bayesianScore.toFixed(3)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelect(book.id)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#C6A96B]/40 px-3.5 py-2 text-xs font-medium text-[#F5F1E8] transition-colors hover:bg-[#C6A96B] hover:text-[#0B1020] whitespace-nowrap shrink-0"
          >
            Book Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col rounded-lg border border-[#F5F1E8]/10 bg-[#172033] p-4 transition-colors duration-200 hover:border-[#C6A96B]/40">
      <button
        type="button"
        onClick={() => onSelect(book.id)}
        className="mb-4 block w-full text-left focus-visible:outline-2 focus-visible:outline-[#C6A96B]"
      >
        <BookCover
          src={book.coverUrl}
          title={book.title}
          author={authorLine}
          className="aspect-[3/4] w-full"
        />
      </button>

      <div className="flex flex-1 flex-col">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[#A5ADBC]">
          <span className="truncate text-[#A7BFA3]">{book.primaryGenre}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 tabular-nums">{book.publicationYear ?? 'N/A'}</span>
        </div>

        <h3 className="font-serif text-base font-medium leading-snug text-[#F5F1E8] line-clamp-2">
          <button
            type="button"
            onClick={() => onSelect(book.id)}
            className="text-left transition-colors hover:text-[#C6A96B] focus-visible:outline-2 focus-visible:outline-[#C6A96B]"
          >
            {book.title}
          </button>
        </h3>

        <p className="mt-1 text-xs text-[#A5ADBC] line-clamp-1">{authorLine}</p>

        {showRankingBasis && book.rankingBasis && (
          <p className="mt-2 text-[11px] leading-relaxed text-[#A5ADBC]/90 line-clamp-2">
            {book.rankingBasis}
          </p>
        )}

        <div className="mt-auto space-y-2.5 pt-4">
          <div className="flex items-baseline justify-between border-t border-[#F5F1E8]/10 pt-3">
            <div>
              {hasRating ? (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-[#C6A96B] text-[#C6A96B]" aria-hidden="true" />
                  <span className="font-mono text-sm font-semibold tabular-nums text-[#F5F1E8]">
                    {book.averageRating?.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#A5ADBC]">/ 5</span>
                </div>
              ) : (
                <span className="text-xs font-medium text-[#A5ADBC]">Not Rated</span>
              )}
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#A5ADBC]">
                {hasCount
                  ? `${book.ratingsCount?.toLocaleString()} ratings`
                  : 'No ratings available'}
              </p>
            </div>

            {showBayesianScore && book.bayesianScore !== null && (
              <div className="text-right">
                <p className="text-[10px] text-[#A5ADBC]">Bayesian</p>
                <p className="font-mono text-xs font-semibold tabular-nums text-[#A7BFA3]">
                  {book.bayesianScore.toFixed(3)}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-[#A5ADBC]">
            <span className="truncate">Source: {book.dataSource.replace(' API', '')}</span>
            <button
              type="button"
              onClick={() => onSelect(book.id)}
              className="inline-flex items-center gap-1 font-medium text-[#C6A96B] transition-colors hover:text-[#D5BD88] whitespace-nowrap shrink-0"
            >
              Details
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
