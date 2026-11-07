import React, { useState, useEffect, useRef } from 'react';
import { Search, CornerDownLeft, Sparkles, X } from 'lucide-react';
import { AutoCompleteMatch } from '../types/dsa.ts';

interface AutocompleteBarProps {
  onSelectConcept: (conceptId: string) => void;
  onSearchTrie: (prefix: string) => Promise<AutoCompleteMatch[]>;
}

export const AutocompleteBar: React.FC<AutocompleteBarProps> = ({
  onSelectConcept,
  onSearchTrie,
}) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await onSearchTrie(query.trim());
        setMatches(results);
        setIsOpen(results.length > 0);
      } catch {
        setMatches([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, onSearchTrie]);

  const handleSelect = (conceptId: string) => {
    onSelectConcept(conceptId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#8C7A5E] absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && matches.length > 0 && setIsOpen(true)}
          placeholder="Trie Search (e.g. Graph, Heap, Tree, Stack)..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#FAF7F2] border border-[#D8C8A8] text-xs text-[#252D2B] placeholder-[#8C7A5E] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] font-mono shadow-xs transition"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setMatches([]);
              setIsOpen(false);
            }}
            className="absolute right-2.5 p-0.5 rounded-full hover:bg-[#EAE2D2] text-[#8C7A5E] hover:text-[#252D2B] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#FAF7F2] border border-[#D8C8A8] rounded-lg shadow-lg z-50 overflow-hidden flex flex-col divide-y divide-[#EAE2D2]">
          <div className="px-3 py-1.5 bg-[#F4EFE6] flex items-center justify-between text-[11px] text-[#636E6B]">
            <span className="font-semibold text-[#174A45] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#E88968]" />
              <span>C++ Trie Matches</span>
            </span>
            <span className="font-mono text-[10px]">O(L) Prefix Search</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {matches.map((match, idx) => (
              <button
                key={`${match.conceptId}-${idx}`}
                onClick={() => handleSelect(match.conceptId)}
                className="w-full px-3 py-2 text-left hover:bg-[#F0EAE0] text-xs text-[#252D2B] transition flex items-center justify-between group cursor-pointer"
              >
                <span className="font-medium group-hover:text-[#174A45] transition">
                  {match.word}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-[#8C7A5E]">
                  <span className="font-mono">{match.conceptId}</span>
                  <CornerDownLeft className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-[#E88968]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
