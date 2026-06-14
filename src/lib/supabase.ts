// Re-export of the single app-wide Supabase client.
// Kept only for backwards-compatible imports (`@/lib/supabase`). Do NOT call
// createClient() here — multiple clients create multiple GoTrueClient instances
// that each contend for the auth lock, which makes the iOS navigator.locks
// deadlock worse and breaks login on Safari/iOS.
export { supabase, checkConnection } from '../supabaseClient';
