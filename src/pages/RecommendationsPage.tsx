import { useCallback, useEffect, useState } from 'react';
import { api, type FacetsResponse } from '../lib/api.ts';
import type { RecommendationsPayload } from '../../shared/types.ts';
import { BookCard } from '../components/BookCard.tsx';

interface RecommendationsPageProps {
  onSelectBook: (bookId: string) => void;
}

type CategoryTab =
  | 'highlyRated'
  | 'mostPopular'
  | 'hiddenGems'
  | 'recentlyPublished'
  | 'bestInGenre';

const TABS: Array<{ id: CategoryTab; label: string }> = [
  { id: 'highlyRated', label: 'Highly Rated' },
  { id: 'mostPopular', label: 'Most Popular' },
  { id: 'hiddenGems', label: 'Hidden Gems' },
  { id: 'recentlyPublished', label: 'Recently Published' },
  { id: 'bestInGenre', label: 'Best in Genre' },
];

export function RecommendationsPage({ onSelectBook }: RecommendationsPageProps) {
  const [thresholdM, setThresholdM] = useState(50);
  const [source, setSource] = useState('all');
  const [genre, setGenre] = useState('all');
  const [activeTab, setActiveTab] = useState<CategoryTab>('highlyRated');

  const [data, setData] = useState<RecommendationsPayload | null>(null);
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecommendations({
        m: thresholdM,
        source: source !== 'all' ? source : undefined,
        genre: genre !== 'all' ? genre : undefined,
      });
      setData(res);
      setFacets(res.facets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to calculate recommendations.');
    } finally {
      setLoading(false);
    }
  }, [thresholdM, source, genre]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRecommendations();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loadRecommendations]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-[#F5F1E8]/10 pb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#F5F1E8] sm:text-4xl">
          Honest Recommendation System
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#A5ADBC]">
          Confidence-aware recommendations built strictly on genuine reader ratings and rating
          counts. A title rated 5.0 by 2 readers will not automatically rank above a title rated 4.7
          by thousands of readers.
        </p>
      </div>

      {/* Bayesian Formula & Interactive Threshold Control */}
      <section className="grid grid-cols-1 gap-6 rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <h2 className="font-serif text-lg font-semibold text-[#F5F1E8]">
            Bayesian Weighted Rating Formula
          </h2>
          <div className="rounded-md border border-[#C6A96B]/25 bg-[#0B1020] px-4 py-3 font-mono text-xs text-[#C6A96B] sm:text-sm">
            Weighted Rating = (v / (v + m)) × R + (m / (v + m)) × C
          </div>
          <p className="text-xs leading-relaxed text-[#A5ADBC]">
            Where <span className="font-mono text-[#F5F1E8]">R</span> is the book&apos;s genuine
            average rating, <span className="font-mono text-[#F5F1E8]">v</span> is its rating count,{' '}
            <span className="font-mono text-[#F5F1E8]">
              C = {data?.bayesianGlobalMeanC !== null && data?.bayesianGlobalMeanC !== undefined ? data.bayesianGlobalMeanC.toFixed(3) : '—'}
            </span>{' '}
            is the mean rating across eligible books in this selection, and{' '}
            <span className="font-mono text-[#F5F1E8]">m = {thresholdM}</span> is your chosen
            minimum rating confidence threshold.
          </p>
          <p className="text-xs leading-relaxed text-[#E8E1D3]/85">
            Methodological disclosure: The Confidence-Adjusted Ranking Score is a statistical
            ranking method calculated by this application, not an official rating from any publisher
            or rating platform. Both original and adjusted scores are always shown side by side.
          </p>
        </div>

        <div className="flex flex-col justify-between space-y-4 border-t border-[#F5F1E8]/10 pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="bayesian-m-slider" className="font-medium text-[#F5F1E8]">
                Minimum Rating Threshold (m)
              </label>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#C6A96B]">
                {thresholdM} ratings
              </span>
            </div>
            <input
              id="bayesian-m-slider"
              type="range"
              min={5}
              max={300}
              step={5}
              value={thresholdM}
              onChange={(e) => setThresholdM(Number(e.target.value))}
              className="w-full accent-[#C6A96B]"
            />
            <div className="flex justify-between font-mono text-[10px] text-[#A5ADBC]">
              <span>5 (Sensitive)</span>
              <span>50 (Default)</span>
              <span>300 (Strict)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs">
              <span className="text-[#A5ADBC]">Data Source</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 text-xs text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
              >
                <option value="all">All Sources</option>
                <option value="Open Library API">Open Library API</option>
                <option value="Google Books API">Google Books API</option>
              </select>
            </label>

            <label className="space-y-1 text-xs">
              <span className="text-[#A5ADBC]">Genre Filter</span>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="h-9 w-full rounded-md border border-[#F5F1E8]/15 bg-[#0B1020] px-2.5 text-xs text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none"
              >
                <option value="all">All Genres</option>
                {(facets?.genres ?? []).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <div
        role="tablist"
        aria-label="Recommendation categories"
        className="flex flex-wrap gap-2 border-b border-[#F5F1E8]/10 pb-3"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#C6A96B] text-[#0B1020] font-semibold'
                  : 'border border-[#F5F1E8]/15 bg-[#111827] text-[#A5ADBC] hover:text-[#F5F1E8]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Category Explanation Banner */}
      {data && (
        <div className="rounded-md border border-[#F5F1E8]/10 bg-[#172033]/60 px-4 py-3 text-xs leading-relaxed text-[#E8E1D3]">
          {activeTab === 'highlyRated' && (
            <p>
              <strong className="text-[#C6A96B]">Ranking Basis (Highly Rated):</strong> Ordered by
              Bayesian Confidence-Adjusted Score (m={data.minThresholdM}, C=
              {data.bayesianGlobalMeanC?.toFixed(2) ?? 'N/A'}) among books with at least{' '}
              {data.minThresholdM} authentic ratings.
            </p>
          )}
          {activeTab === 'mostPopular' && (
            <p>
              <strong className="text-[#C6A96B]">Ranking Basis (Most Popular):</strong> Ordered
              strictly by highest genuine total rating count collected from the source API.
            </p>
          )}
          {activeTab === 'hiddenGems' && (
            <p>
              <strong className="text-[#C6A96B]">Ranking Basis (Hidden Gems):</strong>{' '}
              {data.hiddenGemsCriteria.description}
            </p>
          )}
          {activeTab === 'recentlyPublished' && (
            <p>
              <strong className="text-[#C6A96B]">Ranking Basis (Recently Published):</strong>{' '}
              Verified publication year ≥ {data.recentlyPublishedCutoffYear} with authentic ratings,
              ranked by Bayesian Confidence-Adjusted Score. Books without verified publication years
              are excluded.
            </p>
          )}
          {activeTab === 'bestInGenre' && (
            <p>
              <strong className="text-[#C6A96B]">Ranking Basis (Best in Genre):</strong> Single
              highest Bayesian-scored title within each normalized primary genre meeting the
              minimum rating count threshold (or noting exact sample size when a genre has fewer
              ratings).
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-950/25 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[410px] animate-pulse rounded-lg border border-[#F5F1E8]/10 bg-[#172033]/50"
            />
          ))}
        </div>
      ) : activeTab === 'bestInGenre' ? (
        data && data.categories.bestInGenre.length > 0 ? (
          <div className="space-y-4">
            {data.categories.bestInGenre.map((entry) => (
              <div key={entry.genre} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-lg font-medium text-[#C6A96B]">{entry.genre}</h3>
                  <span className="text-xs text-[#A5ADBC]">
                    Top ranked across {entry.genreBookCount} rated titles in genre
                  </span>
                </div>
                <BookCard
                  book={entry.book}
                  viewMode="list"
                  showBayesianScore
                  showRankingBasis
                  onSelect={onSelectBook}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyRecommendations />
        )
      ) : (
        (() => {
          const list = data ? data.categories[activeTab] : [];
          if (list.length === 0) return <EmptyRecommendations />;
          return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  showBayesianScore
                  showRankingBasis
                  onSelect={onSelectBook}
                />
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}

function EmptyRecommendations() {
  return (
    <div className="rounded-lg border border-[#F5F1E8]/10 bg-[#111827] p-10 text-center">
      <p className="font-serif text-lg text-[#F5F1E8]">No Books Met These Exact Criteria</p>
      <p className="mt-1 text-xs text-[#A5ADBC]">
        Try lowering the minimum rating threshold (m) or clearing the genre filter above.
      </p>
    </div>
  );
}
