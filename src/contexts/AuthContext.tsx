import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserBusiness, UserRole, Business } from '@/types';
import * as authService from '@/services/auth.service';
import { supabase } from '../supabaseClient';

interface AuthContextType {
    user: User | null;
    businesses: UserBusiness[];
    currentBusiness: Business | null;
    role: UserRole | null;
    loading: boolean;

    login: (email: string, password: string) => Promise<void>;
    signup: (data: authService.SignupData) => Promise<void>;
    logout: () => Promise<void>;
    switchBusiness: (businessId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    const LS_BUSINESS = "currentBusinessId";
    const LS_VERSION = "appSchemaVersion";
    const SCHEMA_VERSION = "2025-12-12-NUCLEAR"; // Changed to ensure flush

    const hardResetClientState = () => {
        console.log('[Auth] Performing HARD RESET of client state');
        localStorage.removeItem(LS_BUSINESS);
        localStorage.setItem(LS_VERSION, SCHEMA_VERSION);

        // Clear Supabase tokens if possible (best effort)
        Object.keys(localStorage)
            .filter(k => k.startsWith("sb-") && k.endsWith("-auth-token"))
            .forEach(k => localStorage.removeItem(k));
    };

    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            setLoading(true);

            try {
                // 0) Schema version kill-switch
                const v = localStorage.getItem(LS_VERSION);
                if (v !== SCHEMA_VERSION) {
                    hardResetClientState();
                }

                // 1) Session check
                const { data: sessionData } = await supabase.auth.getSession();
                const session = sessionData.session;

                if (!session) {
                    if (cancelled) return;
                    setUser(null);
                    setBusinesses([]);
                    setCurrentBusiness(null);
                    setRole(null);
                    return;
                }

                const uid = session.user.id;

                // 2) Fetch businesses owned by user (strict check)
                // We use maybeSingle or select list to avoid errors if empty
                const { data: bizList, error: bizErr } = await supabase
                    .from("businesses")
                    .select("*")
                    .eq("owner_id", uid)
                    .eq("is_active", true);

                if (bizErr) throw bizErr;

                if (cancelled) return;

                setUser(session.user);

                // Construct UserBusiness objects for compatibility
                const userBusinesses: UserBusiness[] = (bizList || []).map(b => ({
                    id: crypto.randomUUID(), // distinct from business_id
                    user_id: uid,
                    business_id: b.id,
                    role: 'owner', // In this simple model, user is owner
                    is_active: true,
                    created_at: b.created_at || new Date().toISOString()
                }));

                setBusinesses(userBusinesses);

                // 3) No businesses -> hard reset state
                if (!bizList || bizList.length === 0) {
                    console.log('[Auth] User has no businesses. Resetting state.');
                    setCurrentBusiness(null);
                    setRole(null);
                    localStorage.removeItem(LS_BUSINESS);
                    // We don't force signOut/navigate here to avoid loops, just clear data
                    return;
                }

                // 4) Pick active business (validate stored id)
                const storedId = localStorage.getItem(LS_BUSINESS);
                const validStored = storedId && bizList.some(b => b.id === storedId);

                const activeId = validStored ? storedId : bizList[0].id;
                if (activeId) {
                    localStorage.setItem(LS_BUSINESS, activeId);
                    const activeBiz = bizList.find(b => b.id === activeId) ?? bizList[0];
                    setCurrentBusiness(activeBiz);
                    setRole('owner');
                }

            } catch (e) {
                console.error("[Auth bootstrap] fatal:", e);
                if (cancelled) return;
                // Fallback: clear critical state
                setUser(null);
                setBusinesses([]);
                setCurrentBusiness(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        bootstrap();

        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            bootstrap(); // Re-validate ALWAYS
        });

        return () => {
            cancelled = true;
            sub.subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const response = await authService.login({ email, password });
            // State will be updated by onAuthStateChange listener
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (data: authService.SignupData) => {
        setLoading(true);
        try {
            await authService.signup(data);
            // State updated by listener
        } catch (error) {
            console.error('Signup failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authService.logout();
            hardResetClientState(); // Force clear on explicit logout
            setUser(null);
            setBusinesses([]);
            setCurrentBusiness(null);
            setRole(null);
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const switchBusiness = async (businessId: string) => {
        try {
            // Re-fetch to be safe or just find in existing list
            // For robustness, we check the list we already validated
            const business = businesses.find(b => b.business_id === businessId);

            if (!business) {
                throw new Error('Business not found in user list');
            }

            // In a real app we might re-fetch details, but for now filtering from list is safer 
            // against "ghost" IDs not in the list.
            const { data: businessData, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();

            if (error) throw error;

            setCurrentBusiness(businessData);
            setRole(business.role); // owner
            localStorage.setItem(LS_BUSINESS, businessId);
        } catch (error) {
            console.error('Failed to switch business:', error);
            setCurrentBusiness(null);
            setRole(null);
            localStorage.removeItem(LS_BUSINESS);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        businesses,
        currentBusiness,
        role,
        loading,
        login,
        signup,
        logout,
        switchBusiness,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
