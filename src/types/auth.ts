import { ConceptNode, GraphEdge, SummaryResult, RankedConcept, TopologicalSortResult } from './dsa.ts';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AnalysisHistoryRecord {
  id: string;
  user_id: string;
  title: string;
  input_text: string | null;
  pdf_filename: string | null;
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

export type AuthMode = 'login' | 'signup' | 'forgot_password';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}
