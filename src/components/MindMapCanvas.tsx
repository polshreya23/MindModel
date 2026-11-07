import React, { useMemo } from 'react';
import { ConceptNode, GraphEdge } from '../types/dsa.ts';
import { GitFork, Layers } from 'lucide-react';

interface MindMapCanvasProps {
  nodes: ConceptNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}) => {
  const { tiers } = useMemo(() => {
    if (nodes.length === 0) return { tiers: [] };

    const prereqEdges = edges.filter((e) => e.type === 'PREREQUISITE');
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    nodes.forEach((n) => {
      incoming.set(n.id, []);
      outgoing.set(n.id, []);
    });

    prereqEdges.forEach((e) => {
      incoming.get(e.toId)?.push(e.fromId);
      outgoing.get(e.fromId)?.push(e.toId);
    });

    const levelMap = new Map<string, number>();
    const queue: string[] = [];

    nodes.forEach((n) => {
      if ((incoming.get(n.id)?.length || 0) === 0) {
        levelMap.set(n.id, 0);
        queue.push(n.id);
      }
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = levelMap.get(curr) || 0;
      const children = outgoing.get(curr) || [];

      children.forEach((child) => {
        const existing = levelMap.get(child);
        const nextLevel = Math.max(existing ?? 0, currLevel + 1);
        levelMap.set(child, nextLevel);
        queue.push(child);
      });
    }

    nodes.forEach((n) => {
      if (!levelMap.has(n.id)) {
        levelMap.set(n.id, 1);
      }
    });

    const maxLevel = Math.max(...Array.from(levelMap.values()), 0);
    const tierGroups: ConceptNode[][] = Array.from({ length: maxLevel + 1 }, () => []);

    nodes.forEach((n) => {
      const lvl = levelMap.get(n.id) || 0;
      tierGroups[lvl].push(n);
    });

    return {
      tiers: tierGroups.filter((t) => t.length > 0),
    };
  }, [nodes, edges]);

  return (
    <div className="w-full h-full min-h-[520px] bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 overflow-x-auto overflow-y-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#D8C8A8]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#174A45]/10 flex items-center justify-center text-[#174A45]">
            <GitFork className="w-4 h-4 text-[#174A45]" />
          </div>
          <div>
            <h3 className="font-editorial text-base font-bold text-[#174A45]">Hierarchical Mind Map</h3>
            <p className="text-xs text-[#636E6B]">Prerequisite DAG Organized by Learning Stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#636E6B]">
          <Layers className="w-3.5 h-3.5 text-[#E88968]" />
          <span className="font-medium text-[#252D2B]">{tiers.length} Learning Tiers</span>
        </div>
      </div>

      {/* Horizontal Tier Columns */}
      <div className="flex items-start gap-6 min-w-max pb-4">
        {tiers.map((tierNodes, tierIdx) => (
          <div key={`tier-${tierIdx}`} className="flex flex-col gap-3 min-w-[230px]">
            {/* Column Header */}
            <div className="px-3.5 py-2 rounded-xl bg-[#EFE8DC] border border-[#D8C8A8] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#174A45]">
                {tierIdx === 0
                  ? 'Foundation Tier'
                  : tierIdx === tiers.length - 1
                  ? 'Advanced Synthesis'
                  : `Tier ${tierIdx + 1} Concepts`}
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#FAF7F2] text-[#174A45] font-semibold border border-[#D8C8A8]">
                {tierNodes.length}
              </span>
            </div>

            {/* Nodes */}
            <div className="flex flex-col gap-2.5">
              {tierNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 shadow-xs ${
                      isSelected
                        ? 'border-[#E88968] bg-[#FAF7F2] text-[#174A45] shadow-sm ring-2 ring-[#E88968]/50'
                        : 'border-[#D8C8A8] bg-[#FAF7F2] text-[#252D2B] hover:border-[#174A45] hover:bg-[#F5F1E8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs leading-snug">{node.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EFE8DC] text-[#636E6B] shrink-0">
                        deg {node.inDegreePrereq}
                      </span>
                    </div>

                    {node.description && (
                      <p className="text-[11px] text-[#636E6B] line-clamp-2 leading-relaxed">
                        {node.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#8C7A5E] pt-1.5 border-t border-[#D8C8A8]/40">
                      <span className="font-medium text-[#174A45]">{node.category}</span>
                      <span>Freq: {node.frequency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
