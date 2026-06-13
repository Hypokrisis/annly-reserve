import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

/**
 * Single, app-wide Supabase client.
 *
 * IMPORTANT: There must be exactly ONE createClient() call in the whole app.
 * Multiple instances create multiple GoTrueClient objects that race over the
 * same auth token in localStorage — which silently breaks session persistence,
 * especially on Safari/WebKit ("login won't stick"). Every module must import
 * `supabase` from here (or from `@/lib/supabase`, which re-exports this).
 *
 * Storage key and flow type are left at the library defaults on purpose so
 * existing sessions and existing email-confirmation links keep working.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
    db: {
        schema: 'public',
    },
});

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('businesses').select('count').limit(1).single();
        if (error) throw error;
        console.log('[SupabaseClient] Connection check passed');
        return true;
    } catch (err) {
        console.error('[SupabaseClient] Connection check failed:', err);
        return false;
    }
};
