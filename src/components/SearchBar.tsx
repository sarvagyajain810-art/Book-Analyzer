import { useEffect, useRef, useState } from 'react';
import { Clock, Search, Trash2, X } from 'lucide-react';
import { api, type SuggestionItem } from '../lib/api.ts';
import type { SearchHistoryEntry } from '../../shared/types.ts';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (query: string, searchType?: string) => void;
  onSelectBook?: (bookId: string) => void;
  searchType?: string;
  onSearchTypeChange?: (type: string) => void;
  showTypeSelector?: boolean;
  placeholder?: string;
  submitLabel?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onSelectBook,
  searchType = 'all',
  onSearchTypeChange,
  showTypeSelector = false,
  placeholder = 'Search by book title, author, ISBN, or genre…',
  submitLabel = 'Search',
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!focused) return;
    api
      .getSearchHistory()
      .then((res) => setHistory(res.history))
      .catch(() => {});
  }, [focused]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api
        .getSuggestions(trimmed)
        .then((res) => setSuggestions(res.suggestions))
        .catch(() => setSuggestions([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [value]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFocused(false);
    onSubmit(value.trim(), searchType);
  };

  const handleClearHistory = async () => {
    try {
      await api.clearSearchHistory();
      setHistory([]);
    } catch {
      // ignore
    }
  };

  const showDropdown = focused && (suggestions.length > 0 || (value.trim().length < 2 && history.length > 0));

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleFormSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
      >
        {showTypeSelector && onSearchTypeChange && (
          <select
            aria-label="Search field"
            value={searchType}
            onChange={(e) => onSearchTypeChange(e.target.value)}
            className="h-11 rounded-md border border-[#F5F1E8]/15 bg-[#111827] px-3 text-sm text-[#F5F1E8] focus:border-[#C6A96B] focus:outline-none sm:w-36"
          >
            <option value="all">All Fields</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="isbn">ISBN</option>
            <option value="genre">Genre</option>
          </select>
        )}

        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#A5ADBC]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={value}
            onFocus={() => setFocused(true)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setFocused(false);
            }}
            placeholder={placeholder}
            aria-label="Search books"
            className="h-11 w-full rounded-md border border-[#F5F1E8]/15 bg-[#111827] pr-9 pl-10 text-sm text-[#F5F1E8] placeholder:text-[#A5ADBC]/70 focus:border-[#C6A96B] focus:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                onSubmit('', searchType);
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#A5ADBC] transition-colors hover:text-[#F5F1E8]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="h-11 rounded-md bg-[#C6A96B] px-5 text-sm font-semibold text-[#0B1020] transition-colors hover:bg-[#D5BD88] whitespace-nowrap shrink-0"
        >
          {submitLabel}
        </button>
      </form>

      {showDropdown && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-[#F5F1E8]/15 bg-[#111827] shadow-2xl">
          {suggestions.length > 0 ? (
            <div className="py-1.5">
              <p className="px-3.5 py-1 text-[11px] font-medium text-[#A5ADBC]">
                Catalog Suggestions
              </p>
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${item.label}-${idx}`}
                  type="button"
                  onClick={() => {
                    setFocused(false);
                    if (item.bookId && onSelectBook) {
                      onSelectBook(item.bookId);
                    } else {
                      onChange(item.label);
                      onSubmit(item.label, item.type === 'genre' ? 'genre' : item.type === 'author' ? 'author' : 'all');
                    }
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm text-[#F5F1E8] transition-colors hover:bg-[#172033]"
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[11px] capitalize text-[#A5ADBC] shrink-0">
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            history.length > 0 && (
              <div className="py-1.5">
                <div className="flex items-center justify-between px-3.5 py-1">
                  <p className="text-[11px] font-medium text-[#A5ADBC]">Recent Searches</p>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1 text-[11px] text-[#A5ADBC] transition-colors hover:text-[#F5F1E8]"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setFocused(false);
                      onChange(h.query);
                      onSubmit(h.query, h.searchType);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm text-[#F5F1E8] transition-colors hover:bg-[#172033]"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Clock className="h-3.5 w-3.5 text-[#A5ADBC] shrink-0" />
                      <span className="truncate">{h.query}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[#A5ADBC] shrink-0">
                      {h.resultCount} results
                    </span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
