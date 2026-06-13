// Re-export of the single app-wide Supabase client.
// Kept as a separate module path only for backwards-compatible imports
// (`@/lib/supabase`). Do NOT call createClient() here — having more than one
// client creates duplicate GoTrueClient instances that race over the same auth
// token in localStorage and silently break login on Safari/iOS.
export { supabase, checkConnection } from '../supabaseClient';
