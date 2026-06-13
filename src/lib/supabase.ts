// Re-export of the single app-wide Supabase client.
// Kept as a separate module path only for backwards-compatible imports
// (`@/lib/supabase`). Do NOT call createClient() here — see ../supabaseClient.
export { supabase, checkConnection } from '../supabaseClient';
