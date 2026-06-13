import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // CRITICAL iOS FIX: by default auth-js locks every auth operation with
        // the Web Locks API (navigator.locks). On iOS Safari that lock can be
        // acquired and never released, so getSession() / signInWithPassword()
        // hang forever — the app loads but never becomes interactive on iPhone
        // (both Safari and Chrome-on-iOS use WebKit), while desktop works fine.
        // processLock is the library's in-memory lock: it serializes auth calls
        // within the page with no deadlock and no navigator.locks dependency.
        lock: processLock,
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
