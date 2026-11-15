import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header.tsx';
import { TextInputPanel } from './components/TextInputPanel.tsx';
import { GraphCanvas } from './components/GraphCanvas.tsx';
import { MindMapCanvas } from './components/MindMapCanvas.tsx';
import { TraversalControls } from './components/TraversalControls.tsx';
import { AutocompleteBar } from './components/AutocompleteBar.tsx';
import { HeapLeaderboard } from './components/HeapLeaderboard.tsx';
import { PrerequisitePath } from './components/PrerequisitePath.tsx';
import { DsaCodeViewer } from './components/DsaCodeViewer.tsx';
import { NodeDetailModal } from './components/NodeDetailModal.tsx';
import { HistorySidebar } from './components/HistorySidebar.tsx';
import { SupabaseConfigModal } from './components/SupabaseConfigModal.tsx';
import { SAMPLE_CURRICULA } from './data/sampleCurricula.ts';
import {
  ConceptNode,
  GraphEdge,
  TraversalStep,
  SummaryResult,
  BuildGraphResponse,
  RankedConcept,
  TopologicalSortResult,
  AutoCompleteMatch,
  PptxMetadata,
  SlideReference,
} from './types/dsa.ts';
import {
  AnalysisHistoryRecord,
  PresentationHistoryData,
} from './types/history.ts';
import {
  fetchHistory,
  saveAnalysisRecord,
  toggleFavoriteRecord,
  deleteAnalysisRecord,
  clearAllHistory,
  isSupabaseReady,
} from './lib/supabase.ts';
import { Sparkles, AlertCircle, FilePlus2, Presentation } from 'lucide-react';

export default function App() {
  // Optional Remote Persistence Modal State
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(isSupabaseReady());

  // History Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Main Workspace State
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [showIngestModal, setShowIngestModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Graph state
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [heapTopK, setHeapTopK] = useState<RankedConcept[]>([]);
  const [heapArray, setHeapArray] = useState<RankedConcept[]>([]);
  const [topologicalSort, setTopologicalSort] = useState<TopologicalSortResult | null>(null);
  const [presentationInfo, setPresentationInfo] = useState<PresentationHistoryData | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [centralTopicLabel, setCentralTopicLabel] = useState<string | null>(null);

  // Interactive selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNodeModal, setShowNodeModal] = useState<boolean>(false);

  // Traversal & Algorithm Animation State
  const [steps, setSteps] = useState<TraversalStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeAlgorithm, setActiveAlgorithm] = useState<'BFS' | 'DFS' | 'DIJKSTRA' | null>(null);
  const [isRunningAlgorithm, setIsRunningAlgorithm] = useState<boolean>(false);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [dijkstraDistance, setDijkstraDistance] = useState<number | null>(null);

  // Fetch persistent history on initial mount (IndexedDB or anonymous Supabase)
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const records = await fetchHistory();
      setHistory(records);

      if (records.length > 0 && nodes.length === 0) {
        handleRestoreAnalysis(records[0]);
      } else if (records.length === 0 && nodes.length === 0) {
        handleProcessText(SAMPLE_CURRICULA[0].text, SAMPLE_CURRICULA[0].title, false);
      }
    } catch (err) {
      console.warn('History load note:', err);
      if (nodes.length === 0) {
        handleProcessText(SAMPLE_CURRICULA[0].text, SAMPLE_CURRICULA[0].title, false);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setIsDbConnected(isSupabaseReady());
    loadHistory();
  }, []);

  // Helper to derive a clean topic title from text or concepts
  const deriveTitle = (text: string, extractedNodes: ConceptNode[]): string => {
    if (extractedNodes.length > 0) {
      const topNames = extractedNodes.slice(0, 3).map((n) => n.name).join(' & ');
      return `Curriculum: ${topNames}`;
    }
    const firstLine = text.trim().split('\n')[0].replace(/[#*_-]/g, '').trim();
    if (firstLine.length > 3 && firstLine.length < 50) return firstLine;
    return 'DSA Knowledge Graph Analysis';
  };

  // Process text through Python NLP -> C++ Graph Pipeline & Persist to Supabase
  const handleProcessText = async (text: string, customTitle?: string, shouldPersist: boolean = true) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Python NLP Extraction & Summarization
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, maxSentences: 3 }),
      });

      if (!extractRes.ok) {
        throw new Error(`NLP Service error: ${extractRes.statusText}`);
      }

      const extractData = await extractRes.json();
      if (!extractData.success || !extractData.nlp?.success) {
        throw new Error(extractData.nlp?.error || 'Concept extraction failed');
      }

      const extractedSummary: SummaryResult = extractData.summary;
      setSummary(extractedSummary);

      // 2. C++ Graph Building & Analysis
      const rawNodes = extractData.nlp.nodes || [];
      const rawEdges = extractData.nlp.edges || [];

      const buildRes = await fetch('/api/graph/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: rawNodes, edges: rawEdges }),
      });

      if (!buildRes.ok) {
        throw new Error(`C++ Engine error: ${buildRes.statusText}`);
      }

      const buildData: BuildGraphResponse = await buildRes.json();
      if (!buildData.success) {
        throw new Error(buildData.error || 'Failed to construct C++ Graph');
      }

      const newNodes = buildData.graph.nodes;
      const newEdges = buildData.graph.edges;
      const newHeapTopK = buildData.heapTopK || [];
      const newHeapArray = buildData.heapArray || [];
      const newTopo = buildData.topologicalSort || null;

      setNodes(newNodes);
      setEdges(newEdges);
      setHeapTopK(newHeapTopK);
      setHeapArray(newHeapArray);
      setTopologicalSort(newTopo);
      setPresentationInfo(null);

      // Derive document title if explicit customTitle or short first-line heading exists
      let resolvedTitle: string | null = customTitle || null;
      if (!resolvedTitle) {
        const firstLine = text.trim().split('\n')[0].replace(/[#*_-]/g, '').trim();
        if (firstLine.length >= 4 && firstLine.length <= 55 && !firstLine.endsWith('.')) {
          resolvedTitle = firstLine;
        }
      }
      setDocumentTitle(resolvedTitle);
      setCentralTopicLabel(null);

      // Reset traversal states
      setSteps([]);
      setCurrentStepIndex(0);
      setHighlightedPath([]);
      setDijkstraDistance(null);
      setActiveAlgorithm(null);
      setSelectedNodeId(newNodes[0]?.id || null);

      // 3. Persist to persistent history (IndexedDB / Supabase)
      if (shouldPersist) {
        const title = customTitle || deriveTitle(text, newNodes);
        try {
          const savedRecord = await saveAnalysisRecord({
            title,
            inputText: text,
            nodes: newNodes,
            edges: newEdges,
            summary: extractedSummary,
            concepts: rawNodes,
            topologicalSort: newTopo,
            heapTopK: newHeapTopK,
            heapArray: newHeapArray,
          });

          if (savedRecord) {
            setHistory((prev) => [savedRecord, ...prev.filter((h) => h.id !== savedRecord.id)]);
            setSelectedHistoryId(savedRecord.id);
          }
        } catch (dbErr: any) {
          console.warn('Could not persist to history:', dbErr.message);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during processing.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload and parse PDF with PyMuPDF & Persist to Supabase
  const handleUploadPdf = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`PDF Processing Error: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'PDF extraction failed');
      }

      const extractedSummary: SummaryResult = data.summary;
      setSummary(extractedSummary);

      // Build graph with extracted nodes and edges
      const rawNodes = data.nlp?.nodes || [];
      const rawEdges = data.nlp?.edges || [];

      const buildRes = await fetch('/api/graph/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: rawNodes, edges: rawEdges }),
      });

      const buildData: BuildGraphResponse = await buildRes.json();
      if (!buildData.success) {
        throw new Error(buildData.error || 'C++ Graph build failed');
      }

      const newNodes = buildData.graph.nodes;
      const newEdges = buildData.graph.edges;
      const newHeapTopK = buildData.heapTopK || [];
      const newHeapArray = buildData.heapArray || [];
      const newTopo = buildData.topologicalSort || null;

      setNodes(newNodes);
      setEdges(newEdges);
      setHeapTopK(newHeapTopK);
      setHeapArray(newHeapArray);
      setTopologicalSort(newTopo);
      setPresentationInfo(null);
      const pdfTitle =
        data.metadata?.title?.trim() || file.name.replace(/\.[^/.]+$/, '');
      setDocumentTitle(pdfTitle);
      setCentralTopicLabel(null);

      setSteps([]);
      setCurrentStepIndex(0);
      setHighlightedPath([]);
      setDijkstraDistance(null);
      setSelectedNodeId(newNodes[0]?.id || null);

      // Persist PDF analysis to history
      const title = file.name.replace(/\.[^/.]+$/, '');
      try {
        const savedRecord = await saveAnalysisRecord({
          title: `PDF: ${title}`,
          inputText: data.text?.slice(0, 5000),
          pdfFilename: file.name,
          nodes: newNodes,
          edges: newEdges,
          summary: extractedSummary,
          concepts: rawNodes,
          topologicalSort: newTopo,
          heapTopK: newHeapTopK,
          heapArray: newHeapArray,
        });

        if (savedRecord) {
          setHistory((prev) => [savedRecord, ...prev.filter((h) => h.id !== savedRecord.id)]);
          setSelectedHistoryId(savedRecord.id);
        }
      } catch (dbErr: any) {
        console.warn('Could not persist PDF analysis to history:', dbErr.message);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload and extract PDF.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload and parse PowerPoint (.pptx / .ppt) via python-pptx -> NLP -> C++ DSA Pipeline
  const handleUploadPptx = async (
    file: File
  ): Promise<{ metadata?: PptxMetadata; slideCount?: number; title?: string }> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('presentation', file);

      const res = await fetch('/api/upload-pptx', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `PowerPoint Processing Error: ${res.statusText}`);
      }

      const extractedSummary: SummaryResult = data.summary;
      setSummary(extractedSummary);

      const buildData: BuildGraphResponse = data.graphBuild;
      if (!buildData || !buildData.success) {
        throw new Error(buildData?.error || 'C++ Graph build failed for presentation');
      }

      const slideRefsMap: Record<string, SlideReference[]> = data.slideReferences || {};
      const enrichedNodes: ConceptNode[] = (buildData.graph.nodes || []).map((n) => ({
        ...n,
        slideRefs: slideRefsMap[n.id] || n.slideRefs || [],
      }));

      const newEdges = buildData.graph.edges || [];
      const newHeapTopK = buildData.heapTopK || [];
      const newHeapArray = buildData.heapArray || [];
      const newTopo = buildData.topologicalSort || null;

      const meta: PptxMetadata | undefined = data.metadata;
      const ext = file.name.toLowerCase().endsWith('.ppt') ? 'ppt' : 'pptx';
      const deckData: PresentationHistoryData = {
        sourceType: ext,
        filename: file.name,
        presentationTitle: meta?.title || file.name.replace(/\.[^/.]+$/, ''),
        slideCount: meta?.slideCount ?? data.slides?.length ?? 0,
        tableCount: meta?.tableCount ?? 0,
        bulletCount: meta?.bulletCount ?? 0,
        slides: data.slides || [],
        slideReferences: slideRefsMap,
      };

      setNodes(enrichedNodes);
      setEdges(newEdges);
      setHeapTopK(newHeapTopK);
      setHeapArray(newHeapArray);
      setTopologicalSort(newTopo);
      setPresentationInfo(deckData);
      setDocumentTitle(deckData.presentationTitle || file.name.replace(/\.[^/.]+$/, ''));
      setCentralTopicLabel(null);

      setSteps([]);
      setCurrentStepIndex(0);
      setHighlightedPath([]);
      setDijkstraDistance(null);
      setActiveAlgorithm(null);
      setSelectedNodeId(enrichedNodes[0]?.id || null);

      // Persist PowerPoint analysis to history
      const title = deckData.presentationTitle || file.name.replace(/\.[^/.]+$/, '');
      try {
        const savedRecord = await saveAnalysisRecord({
          title: `PPTX: ${title}`,
          inputText: data.text?.slice(0, 8000),
          presentationData: deckData,
          nodes: enrichedNodes,
          edges: newEdges,
          summary: extractedSummary,
          concepts: data.nlp?.nodes || [],
          topologicalSort: newTopo,
          heapTopK: newHeapTopK,
          heapArray: newHeapArray,
        });

        if (savedRecord) {
          setHistory((prev) => [savedRecord, ...prev.filter((h) => h.id !== savedRecord.id)]);
          setSelectedHistoryId(savedRecord.id);
        }
      } catch (dbErr: any) {
        console.warn('Could not persist PowerPoint analysis to history:', dbErr.message);
      }

      return {
        metadata: meta,
        slideCount: deckData.slideCount,
        title: deckData.presentationTitle,
      };
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload and extract PowerPoint presentation.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore Complete Workspace from History without re-running pipeline
  const handleRestoreAnalysis = (item: AnalysisHistoryRecord) => {
    setSelectedHistoryId(item.id);
    const slideRefsMap = item.presentation_data?.slideReferences || {};
    const restoredNodes = (item.graph_data?.nodes || []).map((n) => ({
      ...n,
      slideRefs: n.slideRefs || slideRefsMap[n.id] || undefined,
    }));
    const restoredEdges = item.graph_data?.edges || [];

    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setSummary(item.summary || null);
    setHeapTopK(item.algorithm_results?.heapTopK || []);
    setHeapArray(item.algorithm_results?.heapArray || []);
    setTopologicalSort(item.algorithm_results?.topologicalSort || null);
    setPresentationInfo(item.presentation_data || null);
    setDocumentTitle(
      item.presentation_data?.presentationTitle ||
        item.pdf_filename?.replace(/\.[^/.]+$/, '') ||
        item.title ||
        null
    );
    setCentralTopicLabel(null);

    // Reset algorithm animations
    setSteps([]);
    setCurrentStepIndex(0);
    setHighlightedPath([]);
    setDijkstraDistance(null);
    setActiveAlgorithm(null);
    setSelectedNodeId(restoredNodes[0]?.id || null);
  };

  // Start fresh analysis workspace
  const handleNewWorkspace = () => {
    setSelectedHistoryId(null);
    setNodes([]);
    setEdges([]);
    setSummary(null);
    setHeapTopK([]);
    setHeapArray([]);
    setTopologicalSort(null);
    setPresentationInfo(null);
    setDocumentTitle(null);
    setCentralTopicLabel(null);
    setSteps([]);
    setCurrentStepIndex(0);
    setHighlightedPath([]);
    setDijkstraDistance(null);
    setSelectedNodeId(null);
    setShowIngestModal(true);
  };

  // Toggle favorite status
  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await toggleFavoriteRecord(id, !current);
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_favorite: !current } : item))
      );
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Delete single history item
  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteAnalysisRecord(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
      }
    } catch (err: any) {
      console.error('Error deleting record:', err);
    }
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    try {
      await clearAllHistory();
      setHistory([]);
      setSelectedHistoryId(null);
    } catch (err: any) {
      console.error('Error clearing history:', err);
    }
  };

  // Run BFS
  const handleRunBfs = async (startId: string) => {
    setIsRunningAlgorithm(true);
    try {
      const res = await fetch('/api/graph/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bfs',
          startId,
          nodes,
          edges,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setSteps(data.result.steps || []);
        setCurrentStepIndex(0);
        setActiveAlgorithm('BFS');
        setHighlightedPath([]);
        setDijkstraDistance(null);
      }
    } catch (err) {
      console.error('BFS failed:', err);
    } finally {
      setIsRunningAlgorithm(false);
    }
  };

  // Run DFS
  const handleRunDfs = async (startId: string) => {
    setIsRunningAlgorithm(true);
    try {
      const res = await fetch('/api/graph/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dfs',
          startId,
          nodes,
          edges,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setSteps(data.result.steps || []);
        setCurrentStepIndex(0);
        setActiveAlgorithm('DFS');
        setHighlightedPath([]);
        setDijkstraDistance(null);
      }
    } catch (err) {
      console.error('DFS failed:', err);
    } finally {
      setIsRunningAlgorithm(false);
    }
  };

  // Run Dijkstra
  const handleRunDijkstra = async (startId: string, targetId: string) => {
    setIsRunningAlgorithm(true);
    try {
      const res = await fetch('/api/graph/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dijkstra',
          startId,
          targetId,
          nodes,
          edges,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setSteps(data.result.steps || []);
        setCurrentStepIndex(0);
        setActiveAlgorithm('DIJKSTRA');
        setHighlightedPath(data.result.path || []);
        setDijkstraDistance(data.result.totalDistance ?? null);
      }
    } catch (err) {
      console.error('Dijkstra failed:', err);
    } finally {
      setIsRunningAlgorithm(false);
    }
  };

  // Trie Autocomplete search
  const handleSearchTrie = useCallback(
    async (prefix: string): Promise<AutoCompleteMatch[]> => {
      try {
        const res = await fetch('/api/graph/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'autocomplete',
            prefix,
            maxResults: 8,
            nodes,
            edges,
          }),
        });
        const data = await res.json();
        return data.matches || [];
      } catch {
        return [];
      }
    },
    [nodes, edges]
  );

  // Derive active traversal state for visual canvas
  const currentStep = steps[currentStepIndex];
  const activeTraversalNode = currentStep ? currentStep.currentNode : null;
  const visitedNodes = new Set<string>(currentStep ? currentStep.visitedOrder : []);
  const selectedNode: ConceptNode | null =
    selectedNodeId === '__central_topic__'
      ? {
          id: '__central_topic__',
          name: centralTopicLabel || documentTitle || 'Central Topic',
          description:
            summary?.summary ||
            `Primary document topic synthesizing ${nodes.length} extracted concepts and ${edges.length} relationships.`,
          category: 'Central Topic',
          frequency: nodes.length,
          importanceScore: heapTopK[0]?.score || 10,
          inDegreePrereq: 0,
        }
      : nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#252D2B] flex flex-col font-sans selection:bg-[#E88968]/30 selection:text-[#174A45]">
      {/* 3-Zone Header Contract with Sidebar & Storage Controls */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPdfModal={() => setShowIngestModal(true)}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenConfig={() => setShowConfigModal(true)}
        isDbConnected={isDbConnected}
      />

      {/* Main Workspace with Left History Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dedicated History Sidebar on Left */}
        <HistorySidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          history={history}
          isLoading={historyLoading}
          selectedId={selectedHistoryId}
          onSelectHistory={handleRestoreAnalysis}
          onNewWorkspace={handleNewWorkspace}
          onToggleFavorite={handleToggleFavorite}
          onDeleteHistory={handleDeleteHistory}
          onClearAllHistory={handleClearAllHistory}
        />

        {/* Primary Workspace Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 gap-4 max-w-7xl mx-auto w-full">
          {/* Sub-Header Toolbar: Trie Autocomplete Search & Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF7F2] border border-[#D8C8A8] p-3.5 rounded-2xl shadow-xs">
            <AutocompleteBar
              onSelectConcept={(cid) => {
                setSelectedNodeId(cid);
                setShowNodeModal(true);
              }}
              onSearchTrie={handleSearchTrie}
            />

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#636E6B]">
              {presentationInfo && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#174A45] text-[#FAF7F2] font-mono text-[11px] shrink-0 shadow-2xs">
                  <Presentation className="w-3.5 h-3.5 text-[#E88968]" />
                  <span className="font-semibold truncate max-w-[160px]">
                    {presentationInfo.filename}
                  </span>
                  <span className="text-[#A9BCA8]">
                    ({presentationInfo.slideCount || 0} slides)
                  </span>
                </div>
              )}
              {summary && summary.success && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFE8DC] border border-[#D8C8A8] text-[#174A45]">
                  <Sparkles className="w-3.5 h-3.5 text-[#E88968] shrink-0" />
                  <span className="line-clamp-1 max-w-md text-xs">{summary.summary}</span>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FBEBE7] border border-[#E88968]/70 text-[#8C2A14] text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#E88968] shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#8C2A14] hover:text-black px-2 py-0.5 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Empty Workspace State */}
          {nodes.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#FAF7F2] border border-dashed border-[#D8C8A8] rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EFE8DC] flex items-center justify-center text-[#174A45] mb-3 shadow-2xs">
                <FilePlus2 className="w-6 h-6 text-[#E88968]" />
              </div>
              <h2 className="font-editorial text-xl font-bold text-[#174A45]">
                Workspace Ready for Curriculum Synthesis
              </h2>
              <p className="text-xs text-[#636E6B] max-w-md mt-1 mb-5">
                Input your curriculum text, course syllabus, upload a PowerPoint deck (.pptx/.ppt), or upload an academic PDF to generate an interactive knowledge graph and C++ algorithmic models.
              </p>
              <button
                onClick={() => setShowIngestModal(true)}
                className="px-5 py-2.5 bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Open Input, PPTX &amp; PDF Ingestion Panel
              </button>
            </div>
          )}

          {/* Viewport Content Switcher based on Active Tab */}
          {nodes.length > 0 && activeTab === 'graph' && (
            <div className="flex flex-col gap-4 flex-1">
              {/* Interactive Visual Canvas Stage */}
              <div className="h-[520px] w-full">
                <GraphCanvas
                  nodes={nodes}
                  edges={edges}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={(id) => {
                    setSelectedNodeId(id);
                    setShowNodeModal(true);
                  }}
                  activeTraversalNode={activeTraversalNode}
                  visitedNodes={visitedNodes}
                  highlightedPath={highlightedPath}
                />
              </div>

              {/* Traversal & Algorithm Controls Deck */}
              <TraversalControls
                nodes={nodes}
                onRunBfs={handleRunBfs}
                onRunDfs={handleRunDfs}
                onRunDijkstra={handleRunDijkstra}
                steps={steps}
                currentStepIndex={currentStepIndex}
                onSetStepIndex={setCurrentStepIndex}
                isRunningAlgorithm={isRunningAlgorithm}
                activeAlgorithm={activeAlgorithm}
                dijkstraDistance={dijkstraDistance}
              />
            </div>
          )}

          {nodes.length > 0 && activeTab === 'mindmap' && (
            <div className="flex-1">
              <MindMapCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id, topicLabel) => {
                  if (topicLabel) setCentralTopicLabel(topicLabel);
                  setSelectedNodeId(id);
                  setShowNodeModal(true);
                }}
                topologicalSort={topologicalSort}
                heapTopK={heapTopK}
                documentTitle={documentTitle}
                summaryText={summary?.summary}
                slides={presentationInfo?.slides}
              />
            </div>
          )}

          {nodes.length > 0 && activeTab === 'curriculum' && (
            <div className="flex-1">
              <PrerequisitePath
                topologicalSort={topologicalSort}
                nodes={nodes}
                onSelectNode={(id) => {
                  setSelectedNodeId(id);
                  setShowNodeModal(true);
                }}
                selectedNodeId={selectedNodeId}
              />
            </div>
          )}

          {nodes.length > 0 && activeTab === 'heap' && (
            <div className="flex-1">
              <HeapLeaderboard
                rankedConcepts={heapTopK}
                heapArray={heapArray}
                onSelectNode={(id) => {
                  setSelectedNodeId(id);
                  setShowNodeModal(true);
                }}
                selectedNodeId={selectedNodeId}
              />
            </div>
          )}

          {activeTab === 'code' && (
            <div className="flex-1">
              <DsaCodeViewer />
            </div>
          )}
        </div>
      </div>

      {/* Modal: Document / PowerPoint / PDF Ingestion Drawer */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <TextInputPanel
            onProcessText={handleProcessText}
            onUploadPdf={handleUploadPdf}
            onUploadPptx={handleUploadPptx}
            isLoading={isLoading}
            summary={summary}
            onClose={() => setShowIngestModal(false)}
          />
        </div>
      )}

      {/* Modal: Hash Table Node Inspector */}
      {showNodeModal && selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          edges={edges}
          onClose={() => setShowNodeModal(false)}
          onStartBfs={(id) => {
            setActiveTab('graph');
            handleRunBfs(id);
          }}
          onStartDfs={(id) => {
            setActiveTab('graph');
            handleRunDfs(id);
          }}
        />
      )}

      {/* Modal: History Storage Configuration & Schema Helper */}
      {showConfigModal && (
        <SupabaseConfigModal
          onClose={() => setShowConfigModal(false)}
          onConfigChanged={() => {
            setIsDbConnected(isSupabaseReady());
            loadHistory();
          }}
        />
      )}
    </div>
  );
}
