import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AnalysisHistoryRecord,
  SupabaseConfig,
  PresentationHistoryData,
} from '../types/history.ts';
import {
  ConceptNode,
  GraphEdge,
  SummaryResult,
  RankedConcept,
  TopologicalSortResult,
} from '../types/dsa.ts';
import {
  idbGetAllHistory,
  idbSaveAnalysis,
  idbToggleFavorite,
  idbDeleteAnalysis,
  idbClearHistory,
} from './indexedDbHistory.ts';

const STORAGE_KEY_CONFIG = 'modelmind_supabase_config';
const STORAGE_KEY_WORKSPACE_ID = 'modelmind_workspace_id';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a persistent anonymous workspace identifier so history records
 * remain organized without requiring any user sign-up or login.
 */
export function getWorkspaceId(): string {
  if (typeof window === 'undefined') return 'default-workspace';
  try {
    let wsId = localStorage.getItem(STORAGE_KEY_WORKSPACE_ID);
    if (!wsId) {
      wsId = generateUuid();
      localStorage.setItem(STORAGE_KEY_WORKSPACE_ID, wsId);
    }
    return wsId;
  } catch {
    return 'default-workspace';
  }
}

function isValidHttpUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Resolve configuration from Environment Variables or Local Storage (public anon key only)
export function getStoredConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (
    isValidHttpUrl(envUrl) &&
    envKey &&
    envUrl !== 'https://your-project.supabase.co' &&
    !envUrl!.includes('placeholder') &&
    !envKey.includes('your-anon-public-key')
  ) {
    return {
      url: envUrl!.trim(),
      anonKey: envKey.trim(),
      isConfigured: true,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidHttpUrl(parsed.url) && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          isConfigured: true,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Supabase config:', e);
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
  };
}

let activeClient: SupabaseClient | null = null;
let currentConfig: SupabaseConfig = getStoredConfig();

export function initSupabaseClient(config: SupabaseConfig): SupabaseClient | null {
  if (!isValidHttpUrl(config.url) || !config.anonKey) {
    activeClient = null;
    return null;
  }
  try {
    activeClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    currentConfig = config;
    return activeClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    activeClient = null;
    return null;
  }
}

// Initialize on module load if config exists
initSupabaseClient(currentConfig);

export function getSupabase(): SupabaseClient | null {
  if (!activeClient && currentConfig.isConfigured) {
    initSupabaseClient(currentConfig);
  }
  return activeClient;
}

export function isSupabaseReady(): boolean {
  return !!getSupabase();
}

export function saveUserSupabaseConfig(url: string, anonKey: string): boolean {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    const newConfig: SupabaseConfig = {
      url: cleanUrl,
      anonKey: cleanKey,
      isConfigured: !!(cleanUrl && cleanKey),
    };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    initSupabaseClient(newConfig);
    return true;
  } catch (e) {
    console.error('Could not save Supabase credentials:', e);
    return false;
  }
}

export function clearUserSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
  activeClient = null;
  currentConfig = { url: '', anonKey: '', isConfigured: false };
}

// ==============================================================================
// NO-AUTH PERSISTENT HISTORY (SUPABASE POSTGRESQL + INDEXEDDB FALLBACK)
// ==============================================================================

function mapSupabaseRow(row: any): AnalysisHistoryRecord {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    title: row.title,
    input_text: row.input_text,
    pdf_filename: row.pdf_filename,
    presentation_data: row.mindmap_data?.presentation || null,
    graph_data: row.graph_data || { nodes: [], edges: [] },
    mindmap_data: row.mindmap_data,
    summary: row.summary,
    concepts: row.concepts || [],
    algorithm_results: row.algorithm_results || {
      topologicalSort: null,
      heapTopK: [],
      heapArray: [],
    },
    is_favorite: !!row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchHistory(): Promise<AnalysisHistoryRecord[]> {
  const client = getSupabase();
  const workspaceId = getWorkspaceId();

  if (client) {
    try {
      const { data, error } = await client
        .from('analysis_history')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(mapSupabaseRow);
      }
      if (error) {
        console.warn('Supabase history read fallback to IndexedDB:', error.message);
      }
    } catch (err) {
      console.warn('Supabase unavailable, reading history from IndexedDB:', err);
    }
  }

  return idbGetAllHistory();
}

export async function saveAnalysisRecord(params: {
  title: string;
  inputText?: string;
  pdfFilename?: string;
  presentationData?: PresentationHistoryData | null;
  nodes: ConceptNode[];
  edges: GraphEdge[];
  summary: SummaryResult | null;
  concepts?: any[];
  topologicalSort: TopologicalSortResult | null;
  heapTopK: RankedConcept[];
  heapArray: RankedConcept[];
}): Promise<AnalysisHistoryRecord> {
  const workspaceId = getWorkspaceId();
  const nowIso = new Date().toISOString();

  const localRecord: AnalysisHistoryRecord = {
    id: generateUuid(),
    workspace_id: workspaceId,
    title: params.title || 'Untitled Curriculum Analysis',
    input_text: params.inputText || null,
    pdf_filename: params.pdfFilename || null,
    presentation_data: params.presentationData || null,
    graph_data: {
      nodes: params.nodes,
      edges: params.edges,
    },
    mindmap_data: {
      nodeCount: params.nodes.length,
      edgeCount: params.edges.length,
      tiers: params.topologicalSort?.curriculumOrder || [],
      presentation: params.presentationData || null,
    },
    summary: params.summary,
    concepts: params.concepts || [],
    algorithm_results: {
      topologicalSort: params.topologicalSort,
      heapTopK: params.heapTopK,
      heapArray: params.heapArray,
    },
    is_favorite: false,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // Always persist locally in IndexedDB as reliable browser storage
  await idbSaveAnalysis(localRecord);

  // If Supabase is configured, also persist to PostgreSQL anonymous workspace table
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('analysis_history')
        .insert([
          {
            id: localRecord.id,
            workspace_id: workspaceId,
            title: localRecord.title,
            input_text: localRecord.input_text,
            pdf_filename: localRecord.pdf_filename,
            graph_data: localRecord.graph_data,
            mindmap_data: localRecord.mindmap_data,
            summary: localRecord.summary,
            concepts: localRecord.concepts,
            algorithm_results: localRecord.algorithm_results,
            is_favorite: false,
            created_at: nowIso,
            updated_at: nowIso,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return mapSupabaseRow(data);
      }
      if (error) {
        console.warn('Supabase insert fallback to IndexedDB:', error.message);
      }
    } catch (err) {
      console.warn('Supabase save error (saved to IndexedDB):', err);
    }
  }

  return localRecord;
}

export async function toggleFavoriteRecord(
  historyId: string,
  newFavoriteState: boolean
): Promise<boolean> {
  await idbToggleFavorite(historyId, newFavoriteState);

  const client = getSupabase();
  const workspaceId = getWorkspaceId();
  if (client) {
    try {
      const { error } = await client
        .from('analysis_history')
        .update({ is_favorite: newFavoriteState, updated_at: new Date().toISOString() })
        .eq('id', historyId)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.warn('Supabase favorite sync note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase favorite sync error:', err);
    }
  }

  return true;
}

export async function deleteAnalysisRecord(historyId: string): Promise<boolean> {
  await idbDeleteAnalysis(historyId);

  const client = getSupabase();
  const workspaceId = getWorkspaceId();
  if (client) {
    try {
      const { error } = await client
        .from('analysis_history')
        .delete()
        .eq('id', historyId)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.warn('Supabase delete sync note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete sync error:', err);
    }
  }

  return true;
}

export async function clearAllHistory(): Promise<boolean> {
  await idbClearHistory();

  const client = getSupabase();
  const workspaceId = getWorkspaceId();
  if (client) {
    try {
      const { error } = await client
        .from('analysis_history')
        .delete()
        .eq('workspace_id', workspaceId);

      if (error) {
        console.warn('Supabase clear history note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase clear history error:', err);
    }
  }

  return true;
}
