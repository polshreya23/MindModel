import React from 'react';
import { TopologicalSortResult, ConceptNode } from '../types/dsa.ts';
import { ListOrdered, AlertTriangle } from 'lucide-react';

interface PrerequisitePathProps {
  topologicalSort: TopologicalSortResult | null;
  nodes: ConceptNode[];
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
}

export const PrerequisitePath: React.FC<PrerequisitePathProps> = ({
  topologicalSort,
  nodes,
  onSelectNode,
  selectedNodeId,
}) => {
  if (!topologicalSort) return null;

  const nodeMap = new Map<string, ConceptNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 flex flex-col gap-5 shadow-sm text-[#252D2B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D8C8A8]/60 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#174A45]/10 flex items-center justify-center text-[#174A45]">
            <ListOrdered className="w-5 h-5 text-[#174A45]" />
          </div>
          <div>
            <h3 className="font-editorial text-base font-bold text-[#174A45]">Prerequisite Learning Roadmap</h3>
            <p className="text-xs text-[#636E6B]">Generated using Kahn's Algorithm for Topological Sorting</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#636E6B]">Time Complexity: <strong className="text-[#174A45]">O(V + E)</strong></span>
          <span aria-hidden="true" className="text-[#D8C8A8]">·</span>
          <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
            topologicalSort.isDAG
              ? 'bg-[#E5EEE8] text-[#245237] border border-[#A9BCA8]'
              : 'bg-[#FBEBE7] text-[#8C2A14] border border-[#E88968]'
          }`}>
            {topologicalSort.isDAG ? 'DAG Invariants Satisfied' : 'Cycle Detected'}
          </span>
        </div>
      </div>

      {/* Cycle Detection Alert */}
      {!topologicalSort.isDAG && (
        <div className="p-4 rounded-xl bg-[#FBEBE7] border border-[#E88968]/70 text-[#8C2A14] text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold text-[#8C2A14]">
            <AlertTriangle className="w-4 h-4 text-[#E88968]" />
            <span>Circular Dependency Warning</span>
          </div>
          <p className="leading-relaxed">
            The prerequisite graph contains circular dependencies among the following concepts, preventing a valid linear curriculum order:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topologicalSort.cycleNodes.map((nodeId) => (
              <span
                key={nodeId}
                onClick={() => onSelectNode(nodeId)}
                className="px-2.5 py-1 rounded-md bg-[#FAF7F2] border border-[#E88968] text-[#8C2A14] font-mono font-semibold cursor-pointer hover:bg-[#F5F1E8]"
              >
                {nodeMap.get(nodeId)?.name || nodeId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ordered Timeline */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-[#174A45]">Recommended Study Sequence (Step-by-Step Curriculum)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {topologicalSort.curriculumOrder.map((nodeId, index) => {
            const node = nodeMap.get(nodeId);
            const isSelected = selectedNodeId === nodeId;

            return (
              <div
                key={nodeId}
                onClick={() => onSelectNode(nodeId)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 shadow-xs ${
                  isSelected
                    ? 'border-[#E88968] bg-[#FAF7F2] text-[#174A45] ring-2 ring-[#E88968]/40 shadow-xs'
                    : 'border-[#D8C8A8] bg-[#FAF7F2] text-[#252D2B] hover:border-[#174A45] hover:bg-[#F5F1E8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-[#174A45] text-[#FAF7F2] flex items-center justify-center text-[10px] font-mono font-bold">
                    {index + 1}
                  </span>
                  <span className="text-[10px] text-[#5B8A6B] font-mono font-medium">
                    {node?.category || 'General'}
                  </span>
                </div>

                <div className="font-semibold text-xs text-[#252D2B]">
                  {node?.name || nodeId}
                </div>

                {node?.description && (
                  <p className="text-[11px] text-[#636E6B] line-clamp-2 leading-relaxed">
                    {node.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
