import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[SupabaseClient] Initializing...', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SupabaseClient] Missing environment variables!');
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    db: {
        schema: 'public',
    },
});

export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('businesses').select('count').limit(1).single();
        if (error) throw error;
        console.log('[SupabaseClient] Connection check passed');
        return true;
    } catch (err) {
        console.error('[SupabaseClient] Connection check failed:', err);
        return false;
    }
};
