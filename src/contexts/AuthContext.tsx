import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User, UserBusiness, UserRole, Business } from '@/types';
import * as authService from '@/services/auth.service';
import { supabase } from '../supabaseClient';

interface BarberProfile {
    id: string;
    name: string;
    businessName: string;
}

interface AuthContextType {
    user: User | null;
    businesses: UserBusiness[];
    currentBusiness: Business | null;
    role: UserRole | null;
    barberProfile: BarberProfile | null;
    loading: boolean;
    loadingMessage: string | null;
    authError: string | null;
    isEmailConfirmed: boolean;

    retryBootstrap: () => void;
    login: (email: string, password: string) => Promise<void>;
    signup: (data: {
        email: string;
        password: string;
        full_name?: string;
        phone?: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    switchBusiness: (businessId: string) => Promise<void>;
    createBusiness: (name: string, slug: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Network timeout (ms) for auth bootstrap queries so the UI never hangs forever. */
const BOOTSTRAP_TIMEOUT_MS = 12000;

/** Rejects if the given promise doesn't settle within `ms`. Keeps the UI from hanging on slow/dead networks. */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
        Promise.resolve(promise).then(
            (v) => { clearTimeout(timer); resolve(v); },
            (e) => { clearTimeout(timer); reject(e); },
        );
    });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    const isEmailConfirmed = !!user?.email_confirmed_at;

    const LS_BUSINESS = "currentBusinessId";
    const LS_VERSION = "appSchemaVersion";
    const SCHEMA_VERSION = "2025-12-19-STABLE-MVP";
    const LS_LAST_ACTIVITY = "spacey_last_activity";
    const LS_LAST_EMAIL = "spacey_last_email";
    const INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours

    const hardResetClientState = () => {
        localStorage.removeItem(LS_BUSINESS);
        localStorage.setItem(LS_VERSION, SCHEMA_VERSION);
    };

    const bootstrap = async () => {
        setLoading(true);
        setLoadingMessage(null);
        setAuthError(null);
        try {
            const v = localStorage.getItem(LS_VERSION);
            if (v !== SCHEMA_VERSION) {
                hardResetClientState();
            }

            const { data: { session } } = await withTimeout(
                supabase.auth.getSession(), BOOTSTRAP_TIMEOUT_MS, 'getSession'
            );
            if (!session) {
                setUser(null);
                setBusinesses([]);
                setCurrentBusiness(null);
                setRole(null);
                return;
            }

            // Inactivity timeout: sign out if inactive for 8h
            const lastActivity = localStorage.getItem(LS_LAST_ACTIVITY);
            if (lastActivity && Date.now() - parseInt(lastActivity) > INACTIVITY_MS) {
                localStorage.setItem(LS_LAST_EMAIL, session.user.email || '');
                await supabase.auth.signOut();
                setUser(null); setBusinesses([]); setCurrentBusiness(null); setRole(null);
                return;
            }
            localStorage.setItem(LS_LAST_ACTIVITY, Date.now().toString());

            const uid = session.user.id;
            setUser(session.user as User);

            // Fetch user businesses (may be empty for normal users)
            const { data: memberships, error } = await withTimeout(
                supabase
                    .from("users_businesses")
                    .select(`
                        *,
                        business:businesses (*)
                    `)
                    .eq("user_id", uid),
                BOOTSTRAP_TIMEOUT_MS,
                'memberships'
            );

            if (error) throw error;

            const userBusinesses = (memberships || []).map(m => ({
                id: m.id,
                user_id: m.user_id,
                business_id: m.business_id,
                role: m.role as UserRole,
                is_active: m.is_active,
                created_at: m.created_at,
                business: m.business
            }));

            setBusinesses(userBusinesses);

            if (userBusinesses.length === 0) {
                setCurrentBusiness(null);
                setRole(null);
                return;
            }

            // Pick active business
            const storedId = localStorage.getItem(LS_BUSINESS);
            const activeMembership = userBusinesses.find(b => b.business_id === storedId) || userBusinesses[0];

            if (activeMembership) {
                localStorage.setItem(LS_BUSINESS, activeMembership.business_id);
                setCurrentBusiness(activeMembership.business);
                setRole(activeMembership.role);

                // Fetch barber record for staff
                if (activeMembership.role === 'barber') {
                    const { data: barber } = await supabase
                        .from('barbers')
                        .select('id, name')
                        .eq('user_id', uid)
                        .eq('business_id', activeMembership.business_id)
                        .maybeSingle();
                    if (barber) {
                        setBarberProfile({
                            id: barber.id,
                            name: barber.name,
                            businessName: activeMembership.business?.name || '',
                        });
                    }
                } else {
                    setBarberProfile(null);
                }
            }

        } catch (e: any) {
            console.error("[Auth bootstrap] fatal:", e);
            const isTimeout = typeof e?.message === 'string' && e.message.startsWith('timeout:');
            if (isTimeout) {
                // Network was too slow / unreachable. Keep whatever we have and let the
                // user retry instead of wiping their session or hanging on a spinner.
                setAuthError('La conexión está lenta o no responde. Revisa tu internet e inténtalo de nuevo.');
            } else {
                setUser(null);
                setBusinesses([]);
                setCurrentBusiness(null);
                setBarberProfile(null);
            }
        } finally {
            setLoading(false);
            setLoadingMessage(null);
        }
    };

    useEffect(() => {
        bootstrap();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                hardResetClientState();
                setUser(null);
                setBusinesses([]);
                setCurrentBusiness(null);
                setRole(null);
                setBarberProfile(null);
                setLoading(false);
            } else if (event === 'SIGNED_IN') {
                // Defer out of the auth callback: awaiting supabase queries directly
                // inside onAuthStateChange can deadlock the internal auth lock.
                // TOKEN_REFRESHED is intentionally ignored — the token is rotated
                // internally and our cached user/role/business don't change, so a
                // full re-fetch on every hourly refresh / tab-focus is wasteful.
                setTimeout(() => { bootstrap(); }, 0);
            }
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            await authService.login({ email, password });
            localStorage.setItem(LS_LAST_ACTIVITY, Date.now().toString());
            localStorage.setItem(LS_LAST_EMAIL, email);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (data: {
        email: string;
        password: string;
        full_name?: string;
        phone?: string;
    }) => {
        setLoading(true);
        try {
            await authService.signup(data);
        } catch (error) {
            console.error('Signup failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            // Even if Supabase call fails, clear local state
            hardResetClientState();
            setUser(null);
            setBusinesses([]);
            setCurrentBusiness(null);
            setRole(null);
            console.warn('Logout warning:', error);
        } finally {
            window.location.href = '/';
        }
    };

    const switchBusiness = async (businessId: string) => {
        try {
            const membership = businesses.find(b => b.business_id === businessId);
            if (!membership) throw new Error('No tienes acceso a este negocio');

            const { data: businessData, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();

            if (error) throw error;

            setCurrentBusiness(businessData);
            setRole(membership.role);
            localStorage.setItem(LS_BUSINESS, businessId);
        } catch (error) {
            console.error('Failed to switch business:', error);
            throw error;
        }
    };

    const createBusiness = async (name: string, slug: string) => {
        setLoading(true);
        try {
            await authService.createBusiness(name, slug);
            await bootstrap(); // Refresh state to pick up new business
        } catch (error) {
            console.error('Failed to create business:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (newRole: 'client' | 'owner') => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { role: newRole }
            });

            if (error) throw error;

            // Update local user state immediately
            const { data: { user: updatedUser } } = await supabase.auth.getUser();
            if (updatedUser) {
                setUser(updatedUser as User);
            }

            // Re-bootstrap to update roles and businesses
            await bootstrap();
        } catch (error) {
            console.error('Failed to update user role:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Memoized so consumers (e.g. the heavy Home tree) only re-render when auth
    // STATE actually changes — not on every AuthProvider render. The provider
    // functions only close over the state listed in deps, so this is correct.
    const value: AuthContextType = useMemo(() => ({
        user,
        businesses,
        currentBusiness,
        role,
        barberProfile,
        loading,
        loadingMessage,
        authError,
        isEmailConfirmed,
        retryBootstrap: bootstrap,
        login,
        signup,
        logout,
        switchBusiness,
        createBusiness,
    }), [user, businesses, currentBusiness, role, barberProfile, loading, loadingMessage, authError]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
