import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Star,
  Trash2,
  Calendar,
  Network,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { AnalysisHistoryRecord } from '../types/auth.ts';

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: AnalysisHistoryRecord[];
  isLoading: boolean;
  selectedId: string | null;
  onSelectHistory: (item: AnalysisHistoryRecord) => void;
  onNewWorkspace: () => void;
  onToggleFavorite: (id: string, current: boolean) => Promise<void>;
  onDeleteHistory: (id: string) => Promise<void>;
  onClearAllHistory: () => Promise<void>;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onToggle,
  history,
  isLoading,
  selectedId,
  onSelectHistory,
  onNewWorkspace,
  onToggleFavorite,
  onDeleteHistory,
  onClearAllHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter history based on search query and favorites toggle
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.input_text && item.input_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.pdf_filename && item.pdf_filename.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFavorite = !filterFavorites || item.is_favorite;
      return matchesSearch && matchesFavorite;
    });
  }, [history, searchQuery, filterFavorites]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Sidebar Container */}
      <aside
        className={`bg-[#FAF7F2] border-r border-[#D8C8A8] transition-all duration-300 ease-in-out flex flex-col shrink-0 z-30 h-full relative ${
          isOpen ? 'w-80' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        {/* Top Header Actions */}
        <div className="p-4 border-b border-[#D8C8A8] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#174A45]" />
              <span className="font-editorial text-sm font-bold text-[#174A45]">
                Curriculum Archive
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#EFE8DC] text-[10px] font-mono text-[#174A45] font-semibold">
              {history.length} Saved
            </span>
          </div>

          {/* New Workspace Button */}
          <button
            onClick={onNewWorkspace}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] rounded-xl text-xs font-semibold shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E88968]" />
            <span>New Workspace</span>
          </button>

          {/* Search History Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C9895] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past analyses..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-[#D8C8A8] rounded-lg text-xs text-[#252D2B] placeholder:text-[#8C9895] focus:outline-none focus:border-[#174A45]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8C9895] hover:text-[#252D2B] cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          {/* Filter Toggles: All vs Favorites */}
          <div className="flex items-center gap-1.5 p-1 bg-[#EFE8DC] rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterFavorites(false)}
              className={`flex-1 py-1 text-center rounded-md transition cursor-pointer ${
                !filterFavorites
                  ? 'bg-white text-[#174A45] font-semibold shadow-2xs'
                  : 'text-[#636E6B] hover:text-[#174A45]'
              }`}
            >
              All Topics ({history.length})
            </button>
            <button
              onClick={() => setFilterFavorites(true)}
              className={`flex-1 py-1 flex items-center justify-center gap-1.5 rounded-md transition cursor-pointer ${
                filterFavorites
                  ? 'bg-white text-[#174A45] font-semibold shadow-2xs'
                  : 'text-[#636E6B] hover:text-[#174A45]'
              }`}
            >
              <Star
                className={`w-3 h-3 ${
                  filterFavorites ? 'fill-[#E88968] text-[#E88968]' : 'text-[#636E6B]'
                }`}
              />
              <span>Favorites</span>
            </button>
          </div>
        </div>

        {/* History List Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#636E6B] gap-2">
              <div className="w-5 h-5 border-2 border-[#174A45]/30 border-t-[#174A45] rounded-full animate-spin" />
              <span className="text-xs">Loading persistent history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 px-4 text-[#636E6B]">
              <Sparkles className="w-6 h-6 text-[#D8C8A8] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#174A45]">
                {filterFavorites
                  ? 'No bookmarked analyses'
                  : searchQuery
                  ? 'No matching analyses found'
                  : 'No past sessions recorded yet'}
              </p>
              <p className="text-[11px] text-[#8C9895] mt-1">
                {filterFavorites
                  ? 'Click the star icon on any card to bookmark an analysis.'
                  : 'Generate a knowledge graph from text or PDF to save it automatically.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isSelected = selectedId === item.id;
              const nodeCount = item.graph_data?.nodes?.length || 0;
              const edgeCount = item.graph_data?.edges?.length || 0;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EFE8DC] border-[#174A45] shadow-xs'
                      : 'bg-white border-[#D8C8A8] hover:border-[#174A45]/60 hover:bg-[#FAF7F2]'
                  }`}
                >
                  {/* Title and Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-editorial text-xs font-bold text-[#174A45] line-clamp-1 flex-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.id, item.is_favorite);
                        }}
                        className="p-1 rounded hover:bg-[#D8C8A8]/40 transition text-[#8C9895] hover:text-[#E88968] cursor-pointer"
                        title={item.is_favorite ? 'Remove Favorite' : 'Save to Favorites'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            item.is_favorite
                              ? 'fill-[#E88968] text-[#E88968]'
                              : 'text-[#8C9895]'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(item.id);
                        }}
                        className="p-1 rounded hover:bg-[#FBEBE7] transition text-[#8C9895] hover:text-[#8C2A14] cursor-pointer"
                        title="Delete this analysis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary / Snippet */}
                  {item.summary?.summary && (
                    <p className="text-[11px] text-[#636E6B] line-clamp-2 mt-1 leading-relaxed">
                      {item.summary.summary}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[10px] text-[#8C9895] mt-2 pt-2 border-t border-[#D8C8A8]/40">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[#174A45]">
                        <Network className="w-3 h-3 text-[#A9BCA8]" />
                        {nodeCount}c / {edgeCount}r
                      </span>
                      {item.pdf_filename && (
                        <span className="flex items-center gap-0.5 text-[#E88968] font-mono">
                          <FileText className="w-3 h-3" />
                          PDF
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#8C9895]" />
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions: Clear All History */}
        {history.length > 0 && (
          <div className="p-3 border-t border-[#D8C8A8] bg-[#EFE8DC]/40">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#8C2A14] hover:bg-[#FBEBE7] rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Entire History</span>
            </button>
          </div>
        )}
      </aside>

      {/* Floating Toggle Tab when Sidebar is closed */}
      <button
        onClick={onToggle}
        className="fixed left-0 top-20 z-40 bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] p-2 rounded-r-xl shadow-md border-y border-r border-[#D8C8A8] transition-all cursor-pointer flex items-center justify-center"
        title={isOpen ? 'Collapse Archive Sidebar' : 'Expand Archive Sidebar'}
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-[#E88968]" />
        ) : (
          <div className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-[#E88968]" />
            <span className="text-[11px] font-editorial font-bold pr-1 hidden sm:inline">
              Archive
            </span>
          </div>
        )}
      </button>

      {/* Delete Single Entry Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl shadow-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FBEBE7] flex items-center justify-center text-[#8C2A14] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-editorial text-sm font-bold text-[#174A45]">
                  Delete Analysis Record?
                </h3>
                <p className="text-xs text-[#636E6B] mt-1 leading-relaxed">
                  This will permanently delete this saved knowledge graph and algorithmic snapshot from your Supabase PostgreSQL database.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#D8C8A8]">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#252D2B] hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingId;
                  setDeletingId(null);
                  if (id) await onDeleteHistory(id);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#8C2A14] text-white hover:bg-[#702110] transition cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl shadow-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FBEBE7] flex items-center justify-center text-[#8C2A14] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-editorial text-sm font-bold text-[#174A45]">
                  Clear All Saved History?
                </h3>
                <p className="text-xs text-[#636E6B] mt-1 leading-relaxed">
                  Are you sure you want to remove all {history.length} saved analysis records? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#D8C8A8]">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#252D2B] hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowClearConfirm(false);
                  await onClearAllHistory();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#8C2A14] text-white hover:bg-[#702110] transition cursor-pointer"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
