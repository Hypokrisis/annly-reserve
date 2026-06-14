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
        // iOS fix: the default auth lock uses navigator.locks, which can deadlock
        // on iOS Safari/WebKit (getSession/signInWithPassword hang forever → the
        // app loads but never lets you do anything). processLock is the library's
        // in-memory lock: serializes auth calls without navigator.locks.
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
