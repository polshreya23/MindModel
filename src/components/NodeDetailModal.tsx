import React from 'react';
import { ConceptNode, GraphEdge } from '../types/dsa.ts';
import { X, Network, Play, Presentation } from 'lucide-react';

interface NodeDetailModalProps {
  node: ConceptNode | null;
  edges: GraphEdge[];
  onClose: () => void;
  onStartBfs: (nodeId: string) => void;
  onStartDfs: (nodeId: string) => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  edges,
  onClose,
  onStartBfs,
  onStartDfs,
}) => {
  if (!node) return null;

  // Compute djb2 hash for educational demonstration
  let hash = 5381;
  for (let i = 0; i < node.id.length; i++) {
    hash = ((hash << 5) + hash) + node.id.charCodeAt(i);
  }
  const bucketIndex = Math.abs(hash % 64);

  const outgoingConceptual = edges.filter(
    (e) => e.fromId === node.id && e.type === 'CONCEPTUAL'
  );
  const outgoingPrereq = edges.filter(
    (e) => e.fromId === node.id && e.type === 'PREREQUISITE'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-[#252D2B]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[#D8C8A8]/60">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-[#174A45] font-semibold uppercase tracking-wider">
              Hash Table Node Inspector
            </span>
            <h3 className="font-editorial text-lg font-bold text-[#174A45]">{node.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#EFE8DC] text-[#636E6B] hover:text-[#174A45] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        {node.description && (
          <p className="text-xs text-[#252D2B] leading-relaxed bg-[#F5F1E8] p-3.5 rounded-xl border border-[#D8C8A8]/60">
            {node.description}
          </p>
        )}

        {/* DSA Hash Table Properties Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#D8C8A8] flex flex-col gap-0.5">
            <span className="text-[10px] text-[#636E6B] font-mono">Bucket Index (Separate Chaining)</span>
            <span className="font-mono text-[#174A45] font-bold">Slot #{bucketIndex} / 64</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#D8C8A8] flex flex-col gap-0.5">
            <span className="text-[10px] text-[#636E6B] font-mono">djb2 Hash Digest</span>
            <span className="font-mono text-[#174A45] font-bold">0x{hash.toString(16).slice(-8)}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#D8C8A8] flex flex-col gap-0.5">
            <span className="text-[10px] text-[#636E6B] font-mono">Max-Heap Importance Score</span>
            <span className="font-mono text-[#E88968] font-bold">{(node.importanceScore || 0).toFixed(1)} pts</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#D8C8A8] flex flex-col gap-0.5">
            <span className="text-[10px] text-[#636E6B] font-mono">Prerequisite In-Degree</span>
            <span className="font-mono text-[#5B8A6B] font-bold">{node.inDegreePrereq || 0} upstream deps</span>
          </div>
        </div>

        {/* Slide-Level Provenance (for PowerPoint uploads) */}
        {node.slideRefs && node.slideRefs.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs font-semibold text-[#174A45] flex items-center gap-1.5">
              <Presentation className="w-3.5 h-3.5 text-[#E88968]" />
              <span>Referenced in Presentation Slides</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.slideRefs.map((ref) => (
                <span
                  key={ref.slideNumber}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFE8DC] border border-[#D8C8A8] text-[11px] text-[#174A45]"
                >
                  <span className="font-mono font-bold text-[#E88968]">Slide {ref.slideNumber}</span>
                  <span className="text-[#636E6B] truncate max-w-[180px]">· {ref.title}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connected Adjacency List */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-semibold text-[#174A45] flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-[#E88968]" />
            <span>Adjacency List Neighbors</span>
          </span>

          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto text-xs">
            {outgoingConceptual.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] border border-[#D8C8A8]">
                <span className="text-[#252D2B] font-medium">{e.toId}</span>
                <span className="text-[10px] font-mono text-[#174A45]">
                  {e.relation} (w: {e.weight.toFixed(1)})
                </span>
              </div>
            ))}
            {outgoingPrereq.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#EAE2D2] border border-[#D8C8A8]">
                <span className="text-[#174A45] font-semibold">{e.toId}</span>
                <span className="text-[10px] font-mono text-[#E88968] font-bold">prerequisite for</span>
              </div>
            ))}
            {outgoingConceptual.length === 0 && outgoingPrereq.length === 0 && (
              <span className="text-xs text-[#8C7A5E] italic p-2">No outgoing edges recorded in graph.</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8C8A8]/60">
          <button
            onClick={() => {
              onStartBfs(node.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] font-semibold text-xs transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-[#E88968]" />
            <span>Start BFS From Here</span>
          </button>
          <button
            onClick={() => {
              onStartDfs(node.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B8A6B] hover:bg-[#456B52] text-[#FAF7F2] font-semibold text-xs transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-[#FAF7F2]" />
            <span>Start DFS From Here</span>
          </button>
        </div>
      </div>
    </div>
  );
};
