import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar, type RouteKey } from './components/Navbar.tsx';
import { ToastStack, type ToastMessage } from './components/Toast.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { BookDetailsPage } from './pages/BookDetailsPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { RecommendationsPage } from './pages/RecommendationsPage.tsx';
import { ReportPage } from './pages/ReportPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';

interface ExploreNavOptions {
  q?: string;
  genre?: string;
  searchType?: string;
}

interface ReportFilterOptions {
  source?: string;
  genre?: string;
  yearMin?: number | null;
  yearMax?: number | null;
  minRatingCount?: number;
}

function parseHashRoute(): { route: RouteKey; bookId: string | null } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('book/')) {
    const id = decodeURIComponent(hash.slice(5));
    return { route: 'book', bookId: id || null };
  }
  const valid: RouteKey[] = ['home', 'explore', 'analytics', 'recommendations', 'report', 'about'];
  if (valid.includes(hash as RouteKey)) {
    return { route: hash as RouteKey, bookId: null };
  }
  return { route: 'home', bookId: null };
}

export default function App() {
  const initial = parseHashRoute();
  const [route, setRoute] = useState<RouteKey>(initial.route);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(initial.bookId);
  const [previousRoute, setPreviousRoute] = useState<RouteKey>('explore');
  const [exploreOpts, setExploreOpts] = useState<ExploreNavOptions>({});
  const [reportFilters, setReportFilters] = useState<ReportFilterOptions | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute();
      setRoute(parsed.route);
      setSelectedBookId(parsed.bookId);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: RouteKey) => {
    setRoute(next);
    setSelectedBookId(null);
    window.location.hash = next === 'home' ? '' : `#/${next}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openExplore = useCallback((opts?: ExploreNavOptions) => {
    setExploreOpts(opts ?? {});
    setRoute('explore');
    setSelectedBookId(null);
    window.location.hash = '#/explore';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openBook = useCallback(
    (bookId: string) => {
      if (route !== 'book') {
        setPreviousRoute(route);
      }
      setSelectedBookId(bookId);
      setRoute('book');
      window.location.hash = `#/book/${encodeURIComponent(bookId)}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [route]
  );

  const openReport = useCallback((filters?: ReportFilterOptions) => {
    setReportFilters(filters);
    setRoute('report');
    setSelectedBookId(null);
    window.location.hash = '#/report';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0B1020] text-[#F5F1E8]">
      <Navbar currentRoute={route} onNavigate={navigate} />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={route === 'book' ? `book-${selectedBookId}` : route}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {route === 'home' && (
              <HomePage
                onNavigateExplore={openExplore}
                onNavigateAnalytics={() => navigate('analytics')}
                onNavigateRecommendations={() => navigate('recommendations')}
                onSelectBook={openBook}
                onNotify={notify}
              />
            )}

            {route === 'explore' && (
              <ExplorePage
                initialQuery={exploreOpts.q ?? ''}
                initialGenre={exploreOpts.genre ?? 'all'}
                initialSearchType={exploreOpts.searchType ?? 'all'}
                onSelectBook={openBook}
                onNotify={notify}
              />
            )}

            {route === 'book' && selectedBookId && (
              <BookDetailsPage
                bookId={selectedBookId}
                onBack={() => navigate(previousRoute === 'book' ? 'explore' : previousRoute)}
                onExploreGenre={(genre) => openExplore({ genre })}
              />
            )}

            {route === 'analytics' && (
              <AnalyticsPage
                onSelectBook={openBook}
                onNavigateReport={(filters) => openReport(filters)}
              />
            )}

            {route === 'recommendations' && (
              <RecommendationsPage onSelectBook={openBook} />
            )}

            {route === 'report' && (
              <ReportPage initialFilters={reportFilters} onNotify={notify} />
            )}

            {route === 'about' && <AboutPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="no-print border-t border-[#F5F1E8]/10 bg-[#0B1020] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 text-xs text-[#A5ADBC] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="font-serif text-sm font-medium text-[#F5F1E8]">Book Rating Analysis</p>
            <p className="mt-1">
              Data Science Mini Project · Developed by Sarvagya Jain (ID: 122042, Section B2, 2026)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => navigate('explore')}
              className="transition-colors hover:text-[#F5F1E8]"
            >
              Explore Books
            </button>
            <button
              type="button"
              onClick={() => navigate('analytics')}
              className="transition-colors hover:text-[#F5F1E8]"
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => navigate('report')}
              className="transition-colors hover:text-[#F5F1E8]"
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => navigate('about')}
              className="transition-colors hover:text-[#F5F1E8]"
            >
              Methodology
            </button>
          </div>
        </div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
