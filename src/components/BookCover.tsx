import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  src: string | null;
  title: string;
  author?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BookCover({ src, title, author, className = '', size = 'md' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative flex flex-col justify-between overflow-hidden rounded-md border border-[#F5F1E8]/10 bg-gradient-to-br from-[#1B263E] via-[#131C30] to-[#0D1323] p-3 text-[#F5F1E8] ${className}`}
        aria-label={`Cover placeholder for ${title}`}
      >
        <div className="flex items-center justify-between border-b border-[#C6A96B]/25 pb-2">
          <BookOpen className="h-3.5 w-3.5 text-[#C6A96B]" aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-wider text-[#A5ADBC]">CATALOG</span>
        </div>
        <div className="my-auto py-2">
          <p
            className={`font-serif font-medium leading-snug text-[#F5F1E8] line-clamp-4 ${
              size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm'
            }`}
          >
            {title}
          </p>
          {author && (
            <p className="mt-1.5 text-[11px] text-[#A5ADBC] line-clamp-1">{author}</p>
          )}
        </div>
        <div className="h-0.5 w-8 bg-[#C6A96B]/60" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-md bg-[#0E1526] ${className}`}>
      <img
        src={src}
        alt={`Book cover for ${title}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}
