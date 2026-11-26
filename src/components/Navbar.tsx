import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type RouteKey =
  | 'home'
  | 'explore'
  | 'analytics'
  | 'recommendations'
  | 'report'
  | 'about'
  | 'book';

interface NavbarProps {
  currentRoute: RouteKey;
  onNavigate: (route: RouteKey) => void;
}

const NAV_LINKS: Array<{ key: RouteKey; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'explore', label: 'Explore' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'about', label: 'About' },
];

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (key: RouteKey) => {
    setMobileOpen(false);
    onNavigate(key);
  };

  return (
    <header className="no-print sticky top-0 z-40 h-16 border-b border-[#F5F1E8]/10 bg-[#0B1020]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleLink('home')}
          className="font-serif text-lg font-semibold tracking-tight text-[#F5F1E8] transition-colors hover:text-[#C6A96B] focus-visible:outline-2 focus-visible:outline-[#C6A96B] whitespace-nowrap shrink-0"
        >
          Book Rating Analysis
        </button>

        {/* Zone 2: 5 clean single-line text nav links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              currentRoute === link.key ||
              (link.key === 'explore' && currentRoute === 'book');
            return (
              <button
                key={link.key}
                type="button"
                onClick={() => handleLink(link.key)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C6A96B] ${
                  isActive
                    ? 'text-[#F5F1E8]'
                    : 'text-[#A5ADBC] hover:text-[#F5F1E8]'
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute right-0 bottom-0 left-0 h-px bg-[#C6A96B] transition-opacity duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA button (+ mobile menu button on small screens) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLink('report')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6A96B] ${
              currentRoute === 'report'
                ? 'bg-[#D5BD88] text-[#0B1020]'
                : 'bg-[#C6A96B] text-[#0B1020] hover:bg-[#D5BD88]'
            }`}
          >
            Generate Report
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#F5F1E8]/15 text-[#F5F1E8] transition-colors hover:border-[#C6A96B]/50 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-b border-[#F5F1E8]/10 bg-[#111827] px-4 py-3 md:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = currentRoute === link.key;
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => handleLink(link.key)}
                  className={`flex h-11 items-center rounded-md px-3 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#172033] text-[#C6A96B]'
                      : 'text-[#F5F1E8] hover:bg-[#172033]/60'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
