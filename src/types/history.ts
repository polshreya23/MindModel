import {
  ConceptNode,
  GraphEdge,
  SummaryResult,
  RankedConcept,
  TopologicalSortResult,
  SlideContent,
  SlideReference,
} from './dsa.ts';

export interface PresentationHistoryData {
  sourceType: 'pptx' | 'ppt' | 'pdf' | 'text';
  filename?: string;
  presentationTitle?: string;
  slideCount?: number;
  tableCount?: number;
  bulletCount?: number;
  slides?: SlideContent[];
  slideReferences?: Record<string, SlideReference[]>;
}

export interface AnalysisHistoryRecord {
  id: string;
  workspace_id?: string;
  title: string;
  input_text: string | null;
  pdf_filename: string | null;
  presentation_data?: PresentationHistoryData | null;
  graph_data: {
    nodes: ConceptNode[];
    edges: GraphEdge[];
  };
  mindmap_data?: any;
  summary: SummaryResult | null;
  concepts: any[];
  algorithm_results: {
    topologicalSort: TopologicalSortResult | null;
    heapTopK: RankedConcept[];
    heapArray: RankedConcept[];
  };
  is_favorite: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}
