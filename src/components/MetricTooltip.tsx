import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface MetricTooltipProps {
  title: string;
  children: React.ReactNode;
}

export function MetricTooltip({ title, children }: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={`Methodology info: ${title}`}
        aria-expanded={open}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-[#A5ADBC] transition-colors hover:text-[#C6A96B] focus-visible:outline-2 focus-visible:outline-[#C6A96B]"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-72 -translate-x-1/2 rounded-lg border border-[#F5F1E8]/15 bg-[#111827] p-3.5 text-left text-xs leading-relaxed text-[#E8E1D3] shadow-xl sm:w-80"
        >
          <p className="mb-1.5 font-medium text-[#C6A96B]">{title}</p>
          <div className="space-y-1.5 text-[#A5ADBC]">{children}</div>
        </div>
      )}
    </div>
  );
}
