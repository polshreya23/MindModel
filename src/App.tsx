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
import { AuthPage } from './components/AuthPage.tsx';
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
} from './types/dsa.ts';
import {
  UserProfile,
  AnalysisHistoryRecord,
} from './types/auth.ts';
import {
  getCurrentSession,
  onAuthStateChange,
  signOutUser,
  fetchUserProfile,
  fetchUserHistory,
  saveAnalysisRecord,
  toggleFavoriteRecord,
  deleteAnalysisRecord,
  clearAllUserHistory,
  isSupabaseReady,
} from './lib/supabase.ts';
import { Sparkles, AlertCircle, FilePlus2, RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication & Session State
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
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

  // 1. Initial Auth Check and Event Listener
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const curSession = await getCurrentSession();
        if (mounted) {
          setSession(curSession);
          if (curSession?.user) {
            loadUserProfile(curSession.user.id, curSession.user.email || '');
            loadHistory(curSession.user.id);
          }
        }
      } catch (err) {
        console.warn('Initial auth check warning:', err);
      } finally {
        if (mounted) {
          setAuthLoading(false);
          setIsDbConnected(isSupabaseReady());
        }
      }
    }

    initAuth();

    const sub = onAuthStateChange((newSession, newUser) => {
      if (!mounted) return;
      setSession(newSession);
      setIsDbConnected(isSupabaseReady());

      if (newUser) {
        loadUserProfile(newUser.id, newUser.email || '');
        loadHistory(newUser.id);
      } else {
        setUserProfile(null);
        setHistory([]);
        setSelectedHistoryId(null);
      }
    });

    return () => {
      mounted = false;
      sub?.unsubscribe();
    };
  }, []);

  // Fetch or construct profile
  const loadUserProfile = async (userId: string, email: string) => {
    try {
      const profile = await fetchUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
      } else {
        const fallbackName = email.split('@')[0] || 'Scholar';
        setUserProfile({
          id: userId,
          email,
          fullName: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
        });
      }
    } catch {
      setUserProfile({
        id: userId,
        email,
        fullName: 'Scholar User',
      });
    }
  };

  // Fetch history for current user from Supabase PostgreSQL
  const loadHistory = async (userId: string) => {
    setHistoryLoading(true);
    try {
      const records = await fetchUserHistory(userId);
      setHistory(records);

      // If user has past history and workspace is currently empty, load the most recent record
      if (records.length > 0 && nodes.length === 0) {
        handleRestoreAnalysis(records[0]);
      } else if (records.length === 0 && nodes.length === 0) {
        // Load initial default sample curriculum
        handleProcessText(SAMPLE_CURRICULA[0].text, 'Sample: Binary Search Trees', false);
      }
    } catch (err) {
      console.warn('History load note:', err);
      if (nodes.length === 0) {
        handleProcessText(SAMPLE_CURRICULA[0].text, 'Sample: Binary Search Trees', false);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

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

      // Reset traversal states
      setSteps([]);
      setCurrentStepIndex(0);
      setHighlightedPath([]);
      setDijkstraDistance(null);
      setActiveAlgorithm(null);
      setSelectedNodeId(newNodes[0]?.id || null);

      // 3. Persist to Supabase PostgreSQL (if user is authenticated and shouldPersist is true)
      if (shouldPersist && session?.user?.id) {
        const title = customTitle || deriveTitle(text, newNodes);
        try {
          const savedRecord = await saveAnalysisRecord(session.user.id, {
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
          console.warn('Could not persist to Supabase history:', dbErr.message);
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

      setSteps([]);
      setCurrentStepIndex(0);
      setHighlightedPath([]);
      setDijkstraDistance(null);
      setSelectedNodeId(newNodes[0]?.id || null);

      // Persist to Supabase
      if (session?.user?.id) {
        const title = file.name.replace(/\.[^/.]+$/, '');
        try {
          const savedRecord = await saveAnalysisRecord(session.user.id, {
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
          console.warn('Could not persist PDF analysis to Supabase:', dbErr.message);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload and extract PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore Complete Workspace from History without re-running pipeline
  const handleRestoreAnalysis = (item: AnalysisHistoryRecord) => {
    setSelectedHistoryId(item.id);
    const restoredNodes = item.graph_data?.nodes || [];
    const restoredEdges = item.graph_data?.edges || [];

    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setSummary(item.summary || null);
    setHeapTopK(item.algorithm_results?.heapTopK || []);
    setHeapArray(item.algorithm_results?.heapArray || []);
    setTopologicalSort(item.algorithm_results?.topologicalSort || null);

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
    setSteps([]);
    setCurrentStepIndex(0);
    setHighlightedPath([]);
    setDijkstraDistance(null);
    setSelectedNodeId(null);
    setShowIngestModal(true);
  };

  // Toggle favorite status in Supabase
  const handleToggleFavorite = async (id: string, current: boolean) => {
    if (!session?.user?.id) return;
    try {
      await toggleFavoriteRecord(id, !current, session.user.id);
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_favorite: !current } : item))
      );
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Delete single history item in Supabase
  const handleDeleteHistory = async (id: string) => {
    if (!session?.user?.id) return;
    try {
      await deleteAnalysisRecord(id, session.user.id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
      }
    } catch (err: any) {
      console.error('Error deleting record:', err);
    }
  };

  // Clear all history for current user in Supabase
  const handleClearAllHistory = async () => {
    if (!session?.user?.id) return;
    try {
      await clearAllUserHistory(session.user.id);
      setHistory([]);
      setSelectedHistoryId(null);
    } catch (err: any) {
      console.error('Error clearing history:', err);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOutUser();
      setSession(null);
      setUserProfile(null);
      setHistory([]);
      setSelectedHistoryId(null);
    } catch (err: any) {
      console.error('Logout error:', err);
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

  // If Auth check is loading, show high-fidelity editorial loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center p-6 text-[#252D2B]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#174A45] flex items-center justify-center text-[#F5F1E8] shadow-md animate-pulse">
            <RefreshCw className="w-5 h-5 animate-spin text-[#E88968]" />
          </div>
          <span className="font-editorial text-xl font-bold text-[#174A45]">
            ModelMind
          </span>
          <span className="text-xs text-[#636E6B] font-mono">
            Verifying scholar security credentials...
          </span>
        </div>
      </div>
    );
  }

  // If User is not logged in, render the AuthPage
  if (!session) {
    return (
      <>
        <AuthPage
          onAuthSuccess={async () => {
            const curSession = await getCurrentSession();
            setSession(curSession);
            if (curSession?.user) {
              loadUserProfile(curSession.user.id, curSession.user.email || '');
              loadHistory(curSession.user.id);
            }
          }}
          onOpenConfig={() => setShowConfigModal(true)}
          supabaseConfigured={isDbConnected}
        />
        {showConfigModal && (
          <SupabaseConfigModal
            onClose={() => setShowConfigModal(false)}
            onConfigChanged={() => setIsDbConnected(isSupabaseReady())}
          />
        )}
      </>
    );
  }

  // Derive active traversal state for visual canvas
  const currentStep = steps[currentStepIndex];
  const activeTraversalNode = currentStep ? currentStep.currentNode : null;
  const visitedNodes = new Set<string>(currentStep ? currentStep.visitedOrder : []);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#252D2B] flex flex-col font-sans selection:bg-[#E88968]/30 selection:text-[#174A45]">
      {/* 3-Zone Header Contract with User & Sidebar Controls */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPdfModal={() => setShowIngestModal(true)}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        userProfile={userProfile}
        onLogout={handleLogout}
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

            <div className="flex items-center gap-2 text-xs text-[#636E6B]">
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
                Input your curriculum text, course syllabus, or upload an academic PDF to generate an interactive knowledge graph and C++ algorithmic models.
              </p>
              <button
                onClick={() => setShowIngestModal(true)}
                className="px-5 py-2.5 bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Open Input &amp; PDF Ingestion Panel
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
                onSelectNode={(id) => {
                  setSelectedNodeId(id);
                  setShowNodeModal(true);
                }}
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

      {/* Modal: Document / PDF Ingestion Drawer */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <TextInputPanel
            onProcessText={handleProcessText}
            onUploadPdf={handleUploadPdf}
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

      {/* Modal: Supabase Configuration & Schema Helper */}
      {showConfigModal && (
        <SupabaseConfigModal
          onClose={() => setShowConfigModal(false)}
          onConfigChanged={() => {
            setIsDbConnected(isSupabaseReady());
            if (session?.user?.id) {
              loadHistory(session.user.id);
            }
          }}
        />
      )}
    </div>
  );
}
