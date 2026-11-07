export type EdgeType = 'CONCEPTUAL' | 'PREREQUISITE';

export interface ConceptNode {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: number;
  importanceScore: number;
  inDegreePrereq: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  fromId: string;
  toId: string;
  relation: string;
  type: EdgeType;
  weight: number;
}

export interface TraversalStep {
  stepNumber: number;
  action: 'visit' | 'enqueue' | 'dequeue' | 'push' | 'pop' | 'relax' | 'settle' | 'cycle_detected';
  currentNode: string;
  containerState: string[];
  visitedOrder: string[];
  explanation: string;
}

export interface TraversalResult {
  algorithm: 'BFS' | 'DFS';
  startNode: string;
  order: string[];
  steps: TraversalStep[];
}

export interface DijkstraResult {
  startNode: string;
  targetNode: string;
  pathFound: boolean;
  totalDistance: number;
  path: string[];
  steps: TraversalStep[];
  distances: Record<string, number>;
}

export interface TopologicalSortResult {
  isDAG: boolean;
  curriculumOrder: string[];
  cycleNodes: string[];
  steps: TraversalStep[];
}

export interface RankedConcept {
  id: string;
  name: string;
  score: number;
  frequency: number;
  degree: number;
}

export interface AutoCompleteMatch {
  word: string;
  conceptId: string;
}

export interface GraphData {
  nodes: ConceptNode[];
  edges: GraphEdge[];
}

export interface BuildGraphResponse {
  success: boolean;
  action: string;
  graph: GraphData;
  heapTopK: RankedConcept[];
  heapArray: RankedConcept[];
  topologicalSort: TopologicalSortResult;
  stats: {
    nodeCount: number;
    edgeCount: number;
    trieWordCount: number;
    heapSize: number;
  };
  error?: string;
}

export interface SummaryResult {
  success: boolean;
  summary: string;
  sentenceCount: number;
  keyPoints: string[];
  error?: string;
}
