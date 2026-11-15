import React from 'react';
import {
  Network,
  GitFork,
  ListOrdered,
  BarChart3,
  Code2,
  UploadCloud,
  Database,
  PanelLeft,
} from 'lucide-react';

export type ActiveTab = 'graph' | 'mindmap' | 'curriculum' | 'heap' | 'code';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenPdfModal: () => void;
  nodeCount: number;
  edgeCount: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenConfig: () => void;
  isDbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenPdfModal,
  nodeCount,
  edgeCount,
  sidebarOpen,
  onToggleSidebar,
  onOpenConfig,
  isDbConnected,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b border-[#D8C8A8] bg-[#FAF7F2]/95 backdrop-blur-sm sticky top-0 z-40 shadow-xs">
      {/* Zone 1: Sidebar Toggle & Brand Wordmark (Editorial Serif) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-lg border transition cursor-pointer ${
            sidebarOpen
              ? 'bg-[#174A45] text-[#FAF7F2] border-[#174A45]'
              : 'bg-[#FAF7F2] text-[#174A45] border-[#D8C8A8] hover:bg-[#EFE8DC]'
          }`}
          title={sidebarOpen ? 'Collapse Archive' : 'Open Saved Analyses Archive'}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <a href="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-[#174A45] flex items-center justify-center text-[#F5F1E8] shadow-sm transition group-hover:bg-[#123834]">
            <Network className="w-4 h-4 text-[#FAF7F2]" />
          </div>
          <span className="font-editorial text-xl font-bold tracking-tight text-[#174A45]">
            ModelMind
          </span>
        </a>

        <div className="hidden xl:flex items-center gap-2 text-xs text-[#636E6B] pl-3 border-l border-[#D8C8A8]/60">
          <span className="font-medium text-[#252D2B]">{nodeCount} Concepts</span>
          <span aria-hidden="true">&bull;</span>
          <span>{edgeCount} Relationships</span>
          <span aria-hidden="true">&bull;</span>
          <span className="text-[#174A45] font-mono font-medium">C++14 Engine</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
        <button
          onClick={() => onSelectTab('graph')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'graph'
              ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
              : 'text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC]'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </button>

        <button
          onClick={() => onSelectTab('mindmap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'mindmap'
              ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
              : 'text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC]'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Mind Map (DAG)</span>
        </button>

        <button
          onClick={() => onSelectTab('curriculum')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'curriculum'
              ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
              : 'text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC]'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Prerequisites</span>
        </button>

        <button
          onClick={() => onSelectTab('heap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'heap'
              ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
              : 'text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Max-Heap</span>
        </button>

        <button
          onClick={() => onSelectTab('code')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'code'
              ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
              : 'text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>C++ Source</span>
        </button>
      </nav>

      {/* Zone 3: Actions, Database status & Scholar Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Upload Button */}
        <button
          onClick={onOpenPdfModal}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-[#FAF7F2] bg-[#174A45] hover:bg-[#123834] active:scale-95 rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0 border border-[#174A45]"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#E88968]" />
          <span className="hidden sm:inline">Upload PPTX / PDF</span>
          <span className="sm:hidden">Upload</span>
        </button>

        {/* Storage Status Button */}
        <button
          onClick={onOpenConfig}
          className="p-2 rounded-lg border border-[#D8C8A8] bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#174A45] transition cursor-pointer relative"
          title={
            isDbConnected
              ? 'Supabase PostgreSQL History Connected'
              : 'Local IndexedDB History Active (Optional Supabase Settings)'
          }
        >
          <Database className="w-4 h-4 text-[#174A45]" />
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              isDbConnected ? 'bg-emerald-600' : 'bg-[#5B8A6B]'
            }`}
          />
        </button>
      </div>
    </header>
  );
};
