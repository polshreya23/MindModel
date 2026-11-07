import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { AnalysisHistoryRecord, UserProfile, SupabaseConfig } from '../types/auth.ts';
import { ConceptNode, GraphEdge, SummaryResult, RankedConcept, TopologicalSortResult } from '../types/dsa.ts';

const STORAGE_KEY_CONFIG = 'modelmind_supabase_config';

// 1. Resolve configuration from Environment Variables or Local Storage
export function getStoredConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (envUrl && envKey && envUrl !== 'https://your-project.supabase.co' && !envUrl.includes('placeholder')) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      isConfigured: true,
    };
  }

  // Check LocalStorage override
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
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
  if (!config.url || !config.anonKey) {
    activeClient = null;
    return null;
  }
  try {
    activeClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
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

// ==========================================
// AUTHENTICATION WRAPPERS
// ==========================================

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('Error fetching Supabase session:', error.message);
    return null;
  }
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
  const client = getSupabase();
  if (!client) {
    return { unsubscribe: () => {} };
  }
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session, session?.user || null);
  });
  return subscription;
}

export async function signUpWithEmail(fullName: string, email: string, pass: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured. Please provide your Supabase URL and Anon Key.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  // Insert or update profiles table
  if (data.user) {
    try {
      await client.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        updated_at: new Date().toISOString(),
      });
    } catch (profileErr) {
      console.warn('Could not auto-insert profile record (RLS or trigger handled):', profileErr);
    }
  }

  return data;
}

export async function signInWithEmail(email: string, pass: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured. Please provide your Supabase URL and Anon Key.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured. Please provide your Supabase URL and Anon Key.');
  }

  const redirectTo = window.location.origin;
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;
  return true;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Profile fetch note:', error.message);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        email: data.email || '',
        fullName: data.full_name || 'Scholar User',
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
      };
    }
  } catch (err) {
    console.warn('Profile fetch error:', err);
  }
  return null;
}

// ==========================================
// PERSISTENT ANALYSIS HISTORY (SUPABASE)
// ==========================================

export async function fetchUserHistory(userId: string): Promise<AnalysisHistoryRecord[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('analysis_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching analysis history from Supabase:', error.message);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    input_text: row.input_text,
    pdf_filename: row.pdf_filename,
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
  }));
}

export async function saveAnalysisRecord(
  userId: string,
  params: {
    title: string;
    inputText?: string;
    pdfFilename?: string;
    nodes: ConceptNode[];
    edges: GraphEdge[];
    summary: SummaryResult | null;
    concepts?: any[];
    topologicalSort: TopologicalSortResult | null;
    heapTopK: RankedConcept[];
    heapArray: RankedConcept[];
  }
): Promise<AnalysisHistoryRecord | null> {
  const client = getSupabase();
  if (!client) {
    console.warn('Cannot persist to Supabase: client is not configured.');
    return null;
  }

  const payload = {
    user_id: userId,
    title: params.title || 'Untitled Curriculum Analysis',
    input_text: params.inputText || null,
    pdf_filename: params.pdfFilename || null,
    graph_data: {
      nodes: params.nodes,
      edges: params.edges,
    },
    mindmap_data: {
      nodeCount: params.nodes.length,
      edgeCount: params.edges.length,
      tiers: params.topologicalSort?.curriculumOrder || [],
    },
    summary: params.summary,
    concepts: params.concepts || [],
    algorithm_results: {
      topologicalSort: params.topologicalSort,
      heapTopK: params.heapTopK,
      heapArray: params.heapArray,
    },
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('analysis_history')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Failed to insert analysis history in Supabase:', error.message);
    throw error;
  }

  return data;
}

export async function toggleFavoriteRecord(
  historyId: string,
  newFavoriteState: boolean,
  userId: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  // 1. Update analysis_history flag
  const { error } = await client
    .from('analysis_history')
    .update({ is_favorite: newFavoriteState, updated_at: new Date().toISOString() })
    .eq('id', historyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error toggling favorite in Supabase:', error.message);
    throw error;
  }

  // 2. Sync favorites table
  try {
    if (newFavoriteState) {
      await client
        .from('favorites')
        .upsert({ user_id: userId, history_id: historyId });
    } else {
      await client
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('history_id', historyId);
    }
  } catch (e) {
    // favorites table might be optional if unified table is used
    console.debug('Favorites join table sync note:', e);
  }

  return true;
}

export async function deleteAnalysisRecord(historyId: string, userId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('analysis_history')
    .delete()
    .eq('id', historyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting record from Supabase:', error.message);
    throw error;
  }
  return true;
}

export async function clearAllUserHistory(userId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('analysis_history')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing history from Supabase:', error.message);
    throw error;
  }
  return true;
}
