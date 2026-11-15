import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ConceptNode,
  GraphEdge,
  RankedConcept,
  SlideContent,
  TopologicalSortResult,
} from '../types/dsa.ts';
import {
  BRANCH_PALETTES,
  MindMapNode,
  PositionedMindMapNode,
  buildMindMapHierarchy,
  computeRadialMindMapLayout,
  wrapCircleLabel,
} from '../lib/mindMapBuilder.ts';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Scan,
  GitFork,
} from 'lucide-react';

interface MindMapCanvasProps {
  nodes: ConceptNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string, centralTopicLabel?: string) => void;
  topologicalSort?: TopologicalSortResult | null;
  heapTopK?: RankedConcept[];
  documentTitle?: string | null;
  summaryText?: string | null;
  slides?: SlideContent[];
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  topologicalSort,
  heapTopK,
  documentTitle,
  summaryText,
  slides,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 620 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 480, y: 310 });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [customPositions, setCustomPositions] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );
  const [activeMindMapId, setActiveMindMapId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  const dragRef = useRef<{
    nodeId: string;
    conceptId: string;
    isCentral: boolean;
    centralLabel: string;
    startClientX: number;
    startClientY: number;
    startWorldX: number;
    startWorldY: number;
    moved: boolean;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Measure container size dynamically
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 960;
        const h = containerRef.current.clientHeight || 620;
        setDimensions({ width: w, height: h });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Build hierarchical presentation tree from real NLP & Graph data
  const rootTree = useMemo<MindMapNode | null>(() => {
    return buildMindMapHierarchy({
      nodes,
      edges,
      topologicalSort,
      heapTopK,
      documentTitle,
      summaryText,
      slides,
    });
  }, [nodes, edges, topologicalSort, heapTopK, documentTitle, summaryText, slides]);

  // Reset custom positions & collapsed branches when a new document/graph loads
  const graphSignature = useMemo(() => {
    return `${documentTitle || ''}::${nodes.map((n) => n.id).join(',')}`;
  }, [documentTitle, nodes]);

  useEffect(() => {
    setCollapsedIds(new Set());
    setCustomPositions(new Map());
    setHoveredNodeId(null);
    setActiveMindMapId(null);
  }, [graphSignature]);

  // Sync external selectedNodeId to highlighted Mind Map node
  useEffect(() => {
    if (!rootTree || !selectedNodeId) return;
    if (selectedNodeId === '__central_topic__' && rootTree.id === '__central_topic__') {
      setActiveMindMapId('__central_topic__');
      return;
    }
    const findByConcept = (node: MindMapNode): string | null => {
      if (node.id === selectedNodeId) return node.id;
      if (node.conceptId === selectedNodeId && node.depth > 0) return node.id;
      for (const child of node.children) {
        const found = findByConcept(child);
        if (found) return found;
      }
      return null;
    };
    const matched = findByConcept(rootTree);
    if (matched) setActiveMindMapId(matched);
  }, [selectedNodeId, rootTree]);

  // Compute overlap-free radial coordinates & edges
  const layout = useMemo(() => {
    return computeRadialMindMapLayout(rootTree, collapsedIds, customPositions);
  }, [rootTree, collapsedIds, customPositions]);

  // Fit entire visible mind map cleanly into the viewport
  const fitToScreen = useCallback(
    (targetNodes: PositionedMindMapNode[] = layout.nodes) => {
      if (targetNodes.length === 0) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      targetNodes.forEach((item) => {
        minX = Math.min(minX, item.x - item.radius - 18);
        maxX = Math.max(maxX, item.x + item.radius + 18);
        minY = Math.min(minY, item.y - item.radius - 18);
        maxY = Math.max(maxY, item.y + item.radius + 18);
      });

      const boxWidth = Math.max(120, maxX - minX);
      const boxHeight = Math.max(120, maxY - minY);
      const padX = 88;
      const padY = 96;

      const availW = Math.max(240, dimensions.width - padX);
      const availH = Math.max(240, dimensions.height - padY);

      const nextZoom = Math.min(1.08, Math.max(0.32, Math.min(availW / boxWidth, availH / boxHeight)));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setZoom(nextZoom);
      setPan({
        x: dimensions.width / 2 - centerX * nextZoom,
        y: dimensions.height / 2 - centerY * nextZoom,
      });
    },
    [dimensions, layout.nodes]
  );

  // Auto-fit when a new graph is loaded or container dimensions first stabilize
  useEffect(() => {
    if (layout.nodes.length > 0) {
      fitToScreen(layout.nodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphSignature, dimensions.width, dimensions.height]);

  // Compute ancestor + descendant highlights for active/hovered node
  const focusNodeId = hoveredNodeId || activeMindMapId;

  const { highlightedNodeIds, highlightedEdgeIds, lineagePath } = useMemo(() => {
    const nodeSet = new Set<string>();
    const edgeSet = new Set<string>();
    const lineage: Array<{ label: string; relation?: string }> = [];

    if (!focusNodeId || !rootTree) {
      return { highlightedNodeIds: nodeSet, highlightedEdgeIds: edgeSet, lineagePath: lineage };
    }

    // Build parent map from full tree
    const parentLookup = new Map<string, MindMapNode | null>();
    const nodeLookup = new Map<string, MindMapNode>();
    const indexTree = (n: MindMapNode, parent: MindMapNode | null) => {
      nodeLookup.set(n.id, n);
      parentLookup.set(n.id, parent);
      n.children.forEach((c) => indexTree(c, n));
    };
    indexTree(rootTree, null);

    // 1. Walk ancestors up to Central Topic
    let curr: MindMapNode | null | undefined = nodeLookup.get(focusNodeId);
    const revLineage: Array<{ label: string; relation?: string }> = [];
    while (curr) {
      nodeSet.add(curr.id);
      revLineage.push({ label: curr.label, relation: curr.relationToParent });
      const parentNode: MindMapNode | null = parentLookup.get(curr.id) || null;
      if (parentNode) {
        edgeSet.add(`${parentNode.id}->${curr.id}`);
      }
      curr = parentNode;
    }
    revLineage.reverse();
    lineage.push(...revLineage);

    // 2. Walk descendants down from focus node
    const markDescendants = (n: MindMapNode) => {
      nodeSet.add(n.id);
      n.children.forEach((c) => {
        edgeSet.add(`${n.id}->${c.id}`);
        markDescendants(c);
      });
    };
    const focusedObj = nodeLookup.get(focusNodeId);
    if (focusedObj) {
      markDescendants(focusedObj);
    }

    return { highlightedNodeIds: nodeSet, highlightedEdgeIds: edgeSet, lineagePath: lineage };
  }, [focusNodeId, rootTree]);

  // Toggle expand/collapse on a parent node
  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Expand all or collapse all Depth 1 branches
  const hasCollapsedAny = collapsedIds.size > 0;
  const handleToggleExpandCollapseAll = () => {
    if (!rootTree) return;
    if (hasCollapsedAny) {
      setCollapsedIds(new Set());
    } else {
      const mainBranchIds = new Set<string>();
      rootTree.children.forEach((c) => {
        if (c.children.length > 0) mainBranchIds.add(c.id);
      });
      if (mainBranchIds.size > 0) {
        setCollapsedIds(mainBranchIds);
      }
    }
  };

  // Reset layout completely
  const handleResetLayout = () => {
    const emptyCollapsed = new Set<string>();
    const emptyCustom = new Map<string, { x: number; y: number }>();
    setCollapsedIds(emptyCollapsed);
    setCustomPositions(emptyCustom);
    setActiveMindMapId(null);
    setHoveredNodeId(null);
    const fresh = computeRadialMindMapLayout(rootTree, emptyCollapsed, emptyCustom);
    fitToScreen(fresh.nodes);
  };

  // Mouse handlers for Panning & Node Dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'svg' ||
      target.id === 'mindmap-bg-layer' ||
      target.dataset?.bg === 'true'
    ) {
      setIsPanning(true);
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
      return;
    }

    if (dragRef.current) {
      const dxScreen = e.clientX - dragRef.current.startClientX;
      const dyScreen = e.clientY - dragRef.current.startClientY;
      if (Math.hypot(dxScreen, dyScreen) > 5) {
        dragRef.current.moved = true;
      }

      if (dragRef.current.moved) {
        const nextX = dragRef.current.startWorldX + dxScreen / zoom;
        const nextY = dragRef.current.startWorldY + dyScreen / zoom;
        const targetId = dragRef.current.nodeId;
        setCustomPositions((prev) => {
          const next = new Map(prev);
          next.set(targetId, { x: nextX, y: nextY });
          return next;
        });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (dragRef.current) {
      const { nodeId, conceptId, isCentral, centralLabel, moved } = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);

      // Clean click (did not drag) -> highlight branch and open concept details
      if (!moved) {
        setActiveMindMapId(nodeId);
        onSelectNode(isCentral ? nodeId : conceptId, isCentral ? centralLabel : undefined);
      }
    }
  };

  // Smooth zoom around viewport center or cursor
  const zoomBy = (delta: number, clientX?: number, clientY?: number) => {
    const nextZoom = Math.min(2.6, Math.max(0.28, zoom + delta));
    if (nextZoom === zoom) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const anchorX = clientX !== undefined && rect ? clientX - rect.left : dimensions.width / 2;
    const anchorY = clientY !== undefined && rect ? clientY - rect.top : dimensions.height / 2;

    const worldX = (anchorX - pan.x) / zoom;
    const worldY = (anchorY - pan.y) / zoom;

    setZoom(nextZoom);
    setPan({
      x: anchorX - worldX * nextZoom,
      y: anchorY - worldY * nextZoom,
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.12 : -0.12;
    zoomBy(factor, e.clientX, e.clientY);
  };

  const mainBranchCount = rootTree?.children.length || 0;
  const visibleNodeCount = layout.nodes.length;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
      data-testid="radial-mindmap-canvas"
      className={`relative w-full h-[620px] min-h-[560px] bg-[#F5F1E8] border border-[#D8C8A8] rounded-2xl overflow-hidden select-none shadow-sm ${
        isPanning || draggingId ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Top-Left Title & Subtle Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 px-4 py-3 bg-[#FAF7F2]/95 backdrop-blur-xs border border-[#D8C8A8] rounded-xl text-xs shadow-xs pointer-events-auto max-w-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#174A45] flex items-center justify-center shrink-0">
            <GitFork className="w-3.5 h-3.5 text-[#E88968]" />
          </div>
          <div>
            <h3 className="font-editorial text-sm font-bold text-[#174A45] leading-tight">
              Hierarchical Mind Map
            </h3>
            <p className="text-[11px] text-[#636E6B] tabular-nums">
              {visibleNodeCount} Visible Nodes · {mainBranchCount} Main Branches
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 border-t border-[#D8C8A8]/60 text-[11px] text-[#252D2B]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#174A45] ring-2 ring-[#E88968]/70" />
            Central Topic
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E88968]" />
            Main Branch
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A9BCA8]" />
            Sub-Branch
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-[#174A45]" />
            Prerequisite
          </span>
        </div>
      </div>

      {/* Top-Right Interactive Toolbar: Zoom, Fit, Expand/Collapse, Reset */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#FAF7F2]/95 backdrop-blur-xs border border-[#D8C8A8] p-1.5 rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => zoomBy(0.18)}
          className="p-1.5 rounded-lg hover:bg-[#EFE8DC] text-[#252D2B] hover:text-[#174A45] transition cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-0.18)}
          className="p-1.5 rounded-lg hover:bg-[#EFE8DC] text-[#252D2B] hover:text-[#174A45] transition cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => fitToScreen()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#EFE8DC] text-xs font-medium text-[#174A45] transition cursor-pointer whitespace-nowrap"
          title="Fit Mind Map to Screen"
        >
          <Scan className="w-3.5 h-3.5 text-[#E88968]" />
          <span className="hidden sm:inline">Fit Screen</span>
        </button>
        <div className="w-px h-4 bg-[#D8C8A8] mx-0.5" />
        <button
          type="button"
          onClick={handleToggleExpandCollapseAll}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#EFE8DC] text-xs font-medium text-[#174A45] transition cursor-pointer whitespace-nowrap"
          title={hasCollapsedAny ? 'Expand All Branches' : 'Collapse Sub-Branches'}
        >
          {hasCollapsedAny ? (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-[#174A45]" />
              <span className="hidden md:inline">Expand All</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-[#636E6B]" />
              <span className="hidden md:inline">Collapse</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleResetLayout}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#EFE8DC] text-xs font-medium text-[#252D2B] hover:text-[#174A45] transition cursor-pointer whitespace-nowrap"
          title="Reset Layout & Expand All"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Layout</span>
        </button>
      </div>

      {/* Bottom-Left Parent -> Child Relationship Lineage Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3 pointer-events-none">
        <div className="px-3.5 py-2 bg-[#FAF7F2]/95 backdrop-blur-xs border border-[#D8C8A8] rounded-xl text-xs text-[#252D2B] shadow-xs pointer-events-auto max-w-2xl truncate">
          {lineagePath.length > 0 ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[#174A45]">Branch Path:</span>
              {lineagePath.map((step, i) => (
                <React.Fragment key={`${step.label}-${i}`}>
                  {i > 0 && <span className="text-[#8C7A5E]">→</span>}
                  <span
                    className={
                      i === lineagePath.length - 1
                        ? 'font-semibold text-[#174A45]'
                        : 'text-[#636E6B]'
                    }
                  >
                    {step.label}
                  </span>
                </React.Fragment>
              ))}
              {lineagePath[lineagePath.length - 1]?.relation && (
                <span className="text-[11px] font-mono text-[#E88968] ml-1">
                  ({lineagePath[lineagePath.length - 1].relation})
                </span>
              )}
            </span>
          ) : (
            <span className="text-[#636E6B]">
              Click any node to inspect details · Drag nodes to rearrange · Click + / − to expand or collapse branches
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center px-3 py-1.5 bg-[#FAF7F2]/95 border border-[#D8C8A8] rounded-xl text-[11px] font-mono text-[#636E6B] tabular-nums shadow-xs">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Interactive Radial SVG Mind Map Canvas */}
      <svg
        id="mindmap-bg-layer"
        width="100%"
        height="100%"
        className="w-full h-full block"
      >
        <defs>
          <filter id="mindmap-node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#174A45" floodOpacity="0.14" />
          </filter>
          <filter id="mindmap-root-shadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#174A45" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Background hit area for drag-to-pan */}
        <rect
          data-bg="true"
          width="100%"
          height="100%"
          fill="transparent"
        />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Subtle Concentric Radial Guide Rings (Academic Atlas Aesthetic) */}
          <g className="pointer-events-none" opacity="0.32">
            <circle cx={0} cy={0} r={215} fill="none" stroke="#D8C8A8" strokeWidth="1" strokeDasharray="3 6" />
            <circle cx={0} cy={0} r={375} fill="none" stroke="#D8C8A8" strokeWidth="1" strokeDasharray="3 6" />
            <circle cx={0} cy={0} r={500} fill="none" stroke="#D8C8A8" strokeWidth="1" strokeDasharray="3 6" />
          </g>

          {/* 1. EDGES LAYER (Always strictly behind nodes) */}
          <g className="mindmap-edges-layer">
            {layout.edges.map((edge) => {
              const palette =
                BRANCH_PALETTES[Math.abs(edge.branchIndex) % BRANCH_PALETTES.length];
              const isFocused = !focusNodeId || highlightedEdgeIds.has(edge.id);
              const isHighlighted = Boolean(focusNodeId && highlightedEdgeIds.has(edge.id));
              const isPrereq = edge.edgeType === 'PREREQUISITE';

              const dx = edge.x2 - edge.x1;
              const dy = edge.y2 - edge.y1;
              const dist = Math.hypot(dx, dy) || 1;
              const nx = -dy / dist;
              const ny = dx / dist;
              const curveAmt = Math.min(24, dist * 0.09) * (edge.branchIndex % 2 === 0 ? 1 : -1);

              const cx1 = edge.x1 + dx * 0.36 + nx * curveAmt;
              const cy1 = edge.y1 + dy * 0.36 + ny * curveAmt;
              const cx2 = edge.x1 + dx * 0.72 + nx * (curveAmt * 0.45);
              const cy2 = edge.y1 + dy * 0.72 + ny * (curveAmt * 0.45);

              const pathD = `M ${edge.x1} ${edge.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${edge.x2} ${edge.y2}`;

              const baseWidth = edge.depth === 1 ? 3.4 : edge.depth === 2 ? 2.3 : 1.7;

              return (
                <g key={edge.id} style={{ opacity: isFocused ? 1 : 0.2 }}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#E88968' : palette.edgeColor}
                    strokeWidth={isHighlighted ? baseWidth + 1.4 : baseWidth}
                    strokeDasharray={isPrereq ? '6 3.5' : undefined}
                    strokeLinecap="round"
                    strokeOpacity={isHighlighted ? 0.95 : 0.72}
                  />
                  {/* Show concise relationship label on highlighted edge */}
                  {isHighlighted && edge.relation && (
                    <g
                      transform={`translate(${(edge.x1 + edge.x2) / 2 + nx * (curveAmt * 0.4)}, ${
                        (edge.y1 + edge.y2) / 2 + ny * (curveAmt * 0.4)
                      })`}
                      className="pointer-events-none"
                    >
                      <rect
                        x={-36}
                        y={-9}
                        width={72}
                        height={18}
                        rx={6}
                        fill="#FAF7F2"
                        stroke="#D8C8A8"
                        strokeWidth={1}
                      />
                      <text
                        textAnchor="middle"
                        dy="0.32em"
                        fill="#174A45"
                        fontSize="8.5"
                        fontWeight="600"
                        fontFamily="'Plus Jakarta Sans', sans-serif"
                      >
                        {edge.relation.length > 14 ? edge.relation.slice(0, 12) + '…' : edge.relation}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. NODES LAYER (Strictly above edges, circular hierarchy) */}
          <g className="mindmap-nodes-layer">
            {layout.nodes.map((item) => {
              const { node, x, y, radius, hiddenDescendantCount } = item;
              const isCentral = node.depth === 0;
              const isHighlighted = !focusNodeId || highlightedNodeIds.has(node.id);
              const isExactFocus = focusNodeId === node.id;
              const hasChildren = node.children.length > 0;
              const isCollapsed = collapsedIds.has(node.id);

              const palette =
                BRANCH_PALETTES[Math.abs(node.branchIndex) % BRANCH_PALETTES.length];

              let fill = '#174A45';
              let stroke = '#FAF7F2';
              let textColor = '#FAF7F2';

              if (isCentral) {
                fill = '#174A45';
                stroke = '#E88968';
                textColor = '#FAF7F2';
              } else if (node.depth === 1) {
                fill = palette.primaryFill;
                stroke = palette.primaryStroke;
                textColor = palette.primaryText;
              } else if (node.depth === 2) {
                fill = palette.subFill;
                stroke = palette.subStroke;
                textColor = palette.subText;
              } else {
                fill = palette.detailFill;
                stroke = palette.detailStroke;
                textColor = palette.detailText;
              }

              const { lines, fontSize } = wrapCircleLabel(node.label, node.depth);
              const lineHeight = fontSize * 1.2;
              const startY = -((lines.length - 1) * lineHeight) / 2;

              // Place expand/collapse button on outward radial rim
              const toggleAngle = isCentral ? Math.PI / 4 : item.angle;
              const toggleX = (radius + 2) * Math.cos(toggleAngle);
              const toggleY = (radius + 2) * Math.sin(toggleAngle);

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  style={{ opacity: isHighlighted ? 1 : 0.28 }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((prev) => (prev === node.id ? null : prev))}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    dragRef.current = {
                      nodeId: node.id,
                      conceptId: node.conceptId,
                      isCentral,
                      centralLabel: node.label,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startWorldX: x,
                      startWorldY: y,
                      moved: false,
                    };
                    setDraggingId(node.id);
                  }}
                  className="cursor-pointer"
                  data-mindmap-node={node.id}
                  data-mindmap-depth={node.depth}
                >
                  {/* Central Topic Outer Halo Ring */}
                  {isCentral && (
                    <circle
                      r={radius + 7}
                      fill="none"
                      stroke="#E88968"
                      strokeWidth={2.5}
                      strokeOpacity={0.9}
                    />
                  )}

                  {/* Selected / Hovered Focus Ring */}
                  {isExactFocus && (
                    <circle
                      r={radius + (isCentral ? 12 : 6)}
                      fill="none"
                      stroke="#E88968"
                      strokeWidth={2.5}
                      strokeDasharray={isCentral ? undefined : '4 2'}
                    />
                  )}

                  {/* Primary Circular Node */}
                  <circle
                    r={radius}
                    fill={fill}
                    stroke={isExactFocus ? '#E88968' : stroke}
                    strokeWidth={isCentral ? 3 : isExactFocus ? 3 : 2}
                    filter={isCentral ? 'url(#mindmap-root-shadow)' : 'url(#mindmap-node-shadow)'}
                  />

                  {/* Wrapped Multi-Line High-Contrast Label */}
                  <text
                    textAnchor="middle"
                    fill={textColor}
                    fontSize={fontSize}
                    fontWeight={isCentral || node.depth === 1 ? '700' : '600'}
                    fontFamily={
                      isCentral
                        ? "'Fraunces', Georgia, serif"
                        : "'Plus Jakarta Sans', sans-serif"
                    }
                    className="pointer-events-none select-none"
                  >
                    {lines.map((line, lIdx) => (
                      <tspan
                        key={lIdx}
                        x={0}
                        y={startY + lIdx * lineHeight}
                        dominantBaseline="central"
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>

                  {/* Expand / Collapse Branch Toggle Button on Parent Nodes */}
                  {hasChildren && !isCentral && (
                    <g
                      transform={`translate(${toggleX}, ${toggleY})`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCollapse(node.id);
                      }}
                      className="cursor-pointer"
                      aria-label={isCollapsed ? `Expand ${node.label}` : `Collapse ${node.label}`}
                    >
                      <circle
                        r={isCollapsed && hiddenDescendantCount > 0 ? 10 : 8.5}
                        fill={isCollapsed ? '#E88968' : '#FAF7F2'}
                        stroke="#174A45"
                        strokeWidth={1.5}
                      />
                      <text
                        textAnchor="middle"
                        dy="0.33em"
                        fill={isCollapsed ? '#252D2B' : '#174A45'}
                        fontSize={isCollapsed && hiddenDescendantCount > 9 ? '8' : '9.5'}
                        fontWeight="700"
                        fontFamily="monospace"
                        className="pointer-events-none select-none"
                      >
                        {isCollapsed ? `+${hiddenDescendantCount}` : '−'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
};
