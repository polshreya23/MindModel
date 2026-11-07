import React from 'react';
import { RankedConcept } from '../types/dsa.ts';
import { Trophy, Layers, ArrowUpRight } from 'lucide-react';

interface HeapLeaderboardProps {
  rankedConcepts: RankedConcept[];
  heapArray: RankedConcept[];
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
}

export const HeapLeaderboard: React.FC<HeapLeaderboardProps> = ({
  rankedConcepts,
  heapArray,
  onSelectNode,
  selectedNodeId,
}) => {
  return (
    <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 flex flex-col gap-5 shadow-sm text-[#252D2B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D8C8A8]/60 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#174A45]/10 flex items-center justify-center text-[#174A45]">
            <Trophy className="w-5 h-5 text-[#174A45]" />
          </div>
          <div>
            <h3 className="font-editorial text-base font-bold text-[#174A45]">Max-Heap Concept Priority Queue</h3>
            <p className="text-xs text-[#636E6B]">Ranked by structural degree centrality and term frequency</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#636E6B] font-mono">
          <span>Extract Max: <strong className="text-[#174A45]">O(log V)</strong></span>
          <span aria-hidden="true">·</span>
          <span>Build Heap: <strong className="text-[#174A45]">O(V)</strong></span>
        </div>
      </div>

      {/* Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-K Ranked List */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-[#174A45] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#E88968]" />
            <span>Top-10 Core Concepts (extractMax sequence)</span>
          </h4>

          <div className="flex flex-col divide-y divide-[#EAE2D2] border border-[#D8C8A8] rounded-xl overflow-hidden bg-[#FAF7F2] shadow-2xs">
            {rankedConcepts.map((item, index) => {
              const isSelected = selectedNodeId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectNode(item.id)}
                  className={`px-3.5 py-3 flex items-center justify-between transition cursor-pointer hover:bg-[#F5F1E8] ${
                    isSelected ? 'bg-[#EFE8DC] border-l-3 border-[#E88968]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                        index === 0
                          ? 'bg-[#174A45] text-[#FAF7F2]'
                          : index === 1
                          ? 'bg-[#5B8A6B] text-[#FAF7F2]'
                          : index === 2
                          ? 'bg-[#E88968] text-[#FAF7F2]'
                          : 'bg-[#EFE8DC] text-[#636E6B]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#252D2B]">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-[#8C7A5E]">deg {item.degree}</span>
                    <span className="text-[#174A45] font-semibold">{item.score.toFixed(1)} pts</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#B8A888]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Binary Heap Array Representation */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-[#174A45] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#5B8A6B]" />
            <span>Binary Heap Array Memory Layout</span>
          </h4>

          <div className="p-4 rounded-xl border border-[#D8C8A8] bg-[#F5F1E8] flex flex-col gap-3">
            <p className="text-[11px] text-[#636E6B] leading-relaxed">
              Every element at index <code className="text-[#174A45] font-mono font-bold">i</code> maps to children at{' '}
              <code className="text-[#174A45] font-mono font-bold">2i + 1</code> and{' '}
              <code className="text-[#174A45] font-mono font-bold">2i + 2</code>, satisfying the Max-Heap invariant{' '}
              <code className="text-[#8C2A14] font-mono font-bold">A[parent] ≥ A[child]</code>.
            </p>

            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pt-1">
              {heapArray.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectNode(item.id)}
                  className={`p-2.5 rounded-lg border transition text-left cursor-pointer flex flex-col gap-1 ${
                    selectedNodeId === item.id
                      ? 'border-[#E88968] bg-[#FAF7F2] text-[#174A45] ring-1 ring-[#E88968]'
                      : 'border-[#D8C8A8] bg-[#FAF7F2] text-[#252D2B] hover:border-[#174A45]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#8C7A5E]">
                    <span>[{idx}]</span>
                    <span className="text-[#174A45] font-semibold">{item.score.toFixed(1)}</span>
                  </div>
                  <span className="text-xs font-semibold line-clamp-1">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
