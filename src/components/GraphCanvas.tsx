import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ConceptNode, GraphEdge, EdgeType } from '../types/dsa.ts';
import { ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react';

interface GraphCanvasProps {
  nodes: ConceptNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  activeTraversalNode: string | null;
  visitedNodes: Set<string>;
  highlightedPath: string[]; // for Dijkstra shortest path
}

interface SimNode extends ConceptNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  activeTraversalNode,
  visitedNodes,
  highlightedPath,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Initialize simulation positions
  const simNodes = useMemo<SimNode[]>(() => {
    const count = nodes.length || 1;
    const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const radiusDist = Math.min(dimensions.width, dimensions.height) * 0.38;

    return nodes.map((node, index) => {
      const angle = (index / count) * 2 * Math.PI;
      const r = Math.max(20, Math.min(38, 18 + (node.frequency || 1) * 3 + (node.inDegreePrereq || 0) * 2));
      return {
        ...node,
        x: center.x + radiusDist * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: center.y + radiusDist * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: r,
      };
    });
  }, [nodes, dimensions]);

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 900,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Physics Simulation: Spring force + Repulsion
  useEffect(() => {
    if (nodes.length === 0) return;

    const nodeMap = new Map<string, SimNode>();
    simNodes.forEach((n) => {
      const existing = positions.get(n.id);
      nodeMap.set(n.id, {
        ...n,
        x: existing ? existing.x : n.x,
        y: existing ? existing.y : n.y,
      });
    });

    let animationId: number;
    let iterations = 0;
    const maxIterations = 90;

    const tick = () => {
      const currentNodes = Array.from(nodeMap.values());
      const center = { x: dimensions.width / 2, y: dimensions.height / 2 };

      // 1. Repulsion between all pairs
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          const force = 8000 / distSq;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (a.id !== draggedNode) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (b.id !== draggedNode) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // 2. Spring attraction along edges
      edges.forEach((edge) => {
        const source = nodeMap.get(edge.fromId);
        const target = nodeMap.get(edge.toId);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = edge.type === 'PREREQUISITE' ? 140 : 180;
          const springForce = (dist - idealDist) * 0.035;

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (source.id !== draggedNode) {
            source.vx += fx;
            source.vy += fy;
          }
          if (target.id !== draggedNode) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      });

      // 3. Center gravity and damping
      currentNodes.forEach((node) => {
        if (node.id === draggedNode) return;

        const gravity = 0.015;
        node.vx += (center.x - node.x) * gravity;
        node.vy += (center.y - node.y) * gravity;

        node.vx *= 0.65;
        node.vy *= 0.65;

        node.x += node.vx;
        node.y += node.vy;

        const pad = node.radius + 15;
        node.x = Math.max(pad, Math.min(dimensions.width - pad, node.x));
        node.y = Math.max(pad, Math.min(dimensions.height - pad, node.y));
      });

      const newPos = new Map<string, { x: number; y: number }>();
      currentNodes.forEach((n) => newPos.set(n.id, { x: n.x, y: n.y }));
      setPositions(newPos);

      iterations++;
      if (iterations < maxIterations || draggedNode !== null) {
        animationId = requestAnimationFrame(tick);
      }
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [simNodes, edges, dimensions, draggedNode]);

  // Mouse handlers for Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (draggedNode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;
        setPositions((prev) => {
          const next = new Map(prev);
          next.set(draggedNode, { x: mouseX, y: mouseY });
          return next;
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
  };

  // Helper: check if edge is part of Dijkstra shortest path
  const isEdgeInShortestPath = (fromId: string, toId: string) => {
    if (highlightedPath.length < 2) return false;
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      if (
        (highlightedPath[i] === fromId && highlightedPath[i + 1] === toId) ||
        (highlightedPath[i] === toId && highlightedPath[i + 1] === fromId)
      ) {
        return true;
      }
    }
    return false;
  };

  // Coordinated Academic Node Palette
  const getNodeVisuals = (category: string) => {
    switch (category) {
      case 'Data Structure':
        return { fill: '#174A45', stroke: '#0F332F', text: '#FAF7F2' }; // Deep Teal
      case 'Algorithm':
        return { fill: '#4A7059', stroke: '#365341', text: '#FAF7F2' }; // Sage Green
      case 'Analysis':
        return { fill: '#8C6D3B', stroke: '#695129', text: '#FAF7F2' }; // Sand Amber
      default:
        return { fill: '#2E5E58', stroke: '#1E3E3A', text: '#FAF7F2' }; // Medium Teal
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full min-h-[520px] bg-[#F5F1E8] overflow-hidden select-none cursor-grab active:cursor-grabbing border border-[#D8C8A8] rounded-2xl shadow-sm"
    >
      {/* Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-3.5 bg-[#FAF7F2]/95 backdrop-blur-xs border border-[#D8C8A8] rounded-xl text-xs shadow-xs pointer-events-auto">
        <div className="font-semibold text-[#174A45] flex items-center gap-1.5 font-editorial">
          <Compass className="w-4 h-4 text-[#E88968]" />
          <span>Graph Relationships</span>
        </div>
        <div className="flex items-center gap-2 text-[#252D2B]">
          <span className="w-3.5 h-0.5 bg-[#B8A888] rounded" />
          <span>Conceptual Association</span>
        </div>
        <div className="flex items-center gap-2 text-[#252D2B]">
          <span className="w-3.5 h-0.5 bg-[#174A45] rounded" />
          <span>Prerequisite Dependency</span>
        </div>
        {highlightedPath.length > 0 && (
          <div className="flex items-center gap-2 text-[#E88968] font-semibold">
            <span className="w-3.5 h-1 bg-[#E88968] rounded" />
            <span>Shortest Path</span>
          </div>
        )}
      </div>

      {/* Zoom / Pan Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#FAF7F2]/95 backdrop-blur-xs border border-[#D8C8A8] p-1 rounded-xl shadow-xs">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
          className="p-1.5 rounded-lg hover:bg-[#EFE8DC] text-[#636E6B] hover:text-[#174A45] transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          className="p-1.5 rounded-lg hover:bg-[#EFE8DC] text-[#636E6B] hover:text-[#174A45] transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg hover:bg-[#EFE8DC] text-[#636E6B] hover:text-[#174A45] transition cursor-pointer"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Canvas Stage */}
      <svg
        id="graph-bg"
        width="100%"
        height="100%"
        className="w-full h-full"
      >
        <defs>
          {/* Arrowhead marker for Prerequisite Directed Edges */}
          <marker
            id="prereq-arrow"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#174A45" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. Render Edges */}
          {edges.map((edge, idx) => {
            const p1 = positions.get(edge.fromId);
            const p2 = positions.get(edge.toId);
            if (!p1 || !p2) return null;

            const isShortest = isEdgeInShortestPath(edge.fromId, edge.toId);
            const isPrereq = edge.type === 'PREREQUISITE';

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={
                    isShortest
                      ? '#E88968'
                      : isPrereq
                      ? '#174A45'
                      : '#C4B494'
                  }
                  strokeWidth={isShortest ? 3.5 : isPrereq ? 2.0 : 1.5}
                  strokeDasharray={isPrereq ? '4 3' : 'none'}
                  strokeOpacity={isShortest ? 1.0 : isPrereq ? 0.85 : 0.65}
                  markerEnd={isPrereq ? 'url(#prereq-arrow)' : undefined}
                />
                {edge.weight !== 1.0 && (
                  <text
                    x={(p1.x + p2.x) / 2}
                    y={(p1.y + p2.y) / 2 - 5}
                    fill="#636E6B"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none pointer-events-none font-medium"
                  >
                    {edge.weight.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. Render Nodes */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const isSelected = selectedNodeId === node.id;
            const isActiveTraversal = activeTraversalNode === node.id;
            const isVisited = visitedNodes.has(node.id);
            const isPathNode = highlightedPath.includes(node.id);
            const visuals = getNodeVisuals(node.category);
            const radius = Math.max(20, Math.min(34, 18 + (node.frequency || 1) * 2));

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggedNode(node.id);
                }}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                {/* Outer Ring for Active / Path / Selected Node */}
                {(isActiveTraversal || isPathNode || isSelected) && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={
                      isPathNode || isActiveTraversal
                        ? '#E88968'
                        : '#174A45'
                    }
                    strokeWidth="2.5"
                    strokeOpacity="0.9"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r={radius}
                  fill={
                    isPathNode
                      ? '#E88968'
                      : isVisited
                      ? '#2A665E'
                      : visuals.fill
                  }
                  stroke={
                    isPathNode
                      ? '#D06A46'
                      : visuals.stroke
                  }
                  strokeWidth={isSelected ? 3 : 2}
                  className="shadow-sm transition-colors"
                />

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill="#FAF7F2"
                  fontSize={radius > 24 ? '11' : '10'}
                  fontWeight="600"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  className="pointer-events-none select-none drop-shadow-xs"
                >
                  {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
                </text>

                {/* In-Degree Pill Marker */}
                <circle
                  cx={radius * 0.72}
                  cy={-radius * 0.72}
                  r="7.5"
                  fill="#FAF7F2"
                  stroke="#D8C8A8"
                  strokeWidth="1.5"
                />
                <text
                  x={radius * 0.72}
                  y={-radius * 0.72}
                  dy="0.35em"
                  textAnchor="middle"
                  fill="#174A45"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {node.inDegreePrereq || 0}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
