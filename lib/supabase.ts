import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export interface SaveQueryPayload {
  originText: string;
  destinationText: string;
  distanceKm: number;
  durationMin: number;
  priority: string;
  recommendations: Array<{
    mode: string;
    price: number;
    time: number;
    waitMin: number;
    availability_score: number;
    final_score: number;
    rank: number;
    why: string;
  }>;
}

export async function logQueryAndResults(payload: SaveQueryPayload): Promise<{ success: boolean; queryId?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase credentials not configured in environment variables.' };
  }

  try {
    const { data: queryData, error: queryError } = await supabase
      .from('queries')
      .insert({
        origin_text: payload.originText,
        destination_text: payload.destinationText,
        distance_km: payload.distanceKm,
        duration_min: payload.durationMin,
        priority: payload.priority,
      })
      .select('id')
      .single();

    if (queryError || !queryData) {
      console.warn('Failed to insert query to Supabase:', queryError);
      return { success: false, error: queryError?.message || 'Insert query failed' };
    }

    const recsToInsert = payload.recommendations.map((r) => ({
      query_id: queryData.id,
      mode: r.mode,
      price: r.price,
      time: r.time,
      wait_min: r.waitMin,
      availability_score: r.availability_score,
      final_score: r.final_score,
      rank: r.rank,
      why: r.why,
    }));

    const { error: recsError } = await supabase.from('recommendations').insert(recsToInsert);
    if (recsError) {
      console.warn('Failed to insert recommendations to Supabase:', recsError);
      return { success: false, queryId: queryData.id, error: recsError.message };
    }

    return { success: true, queryId: queryData.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    console.error('Supabase persistence error:', err);
    return { success: false, error: message };
  }
}
