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
    loadingMessage: string | null;
    isEmailConfirmed: boolean;

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    const isEmailConfirmed = !!user?.email_confirmed_at;

    const LS_BUSINESS = "currentBusinessId";
    const LS_VERSION = "appSchemaVersion";
    const SCHEMA_VERSION = "2025-12-19-STABLE-MVP";

    const hardResetClientState = () => {
        localStorage.removeItem(LS_BUSINESS);
        localStorage.setItem(LS_VERSION, SCHEMA_VERSION);
    };

    const bootstrap = async () => {
        setLoading(true);
        setLoadingMessage(null);
        try {
            const v = localStorage.getItem(LS_VERSION);
            if (v !== SCHEMA_VERSION) {
                hardResetClientState();
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setUser(null);
                setBusinesses([]);
                setCurrentBusiness(null);
                setRole(null);
                return;
            }

            const uid = session.user.id;
            setUser(session.user as User);

            // Fetch user businesses (may be empty for normal users)
            const { data: memberships, error } = await supabase
                .from("users_businesses")
                .select(`
                    *,
                    business:businesses (*)
                `)
                .eq("user_id", uid);

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
            }

        } catch (e) {
            console.error("[Auth bootstrap] fatal:", e);
            setUser(null);
            setBusinesses([]);
            setCurrentBusiness(null);
        } finally {
            setLoading(false);
            setLoadingMessage(null);
        }
    };

    useEffect(() => {
        bootstrap();
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            bootstrap();
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            await authService.login({ email, password });
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
        setLoading(true);
        try {
            await authService.logout();
            hardResetClientState();
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

    const value: AuthContextType = {
        user,
        businesses,
        currentBusiness,
        role,
        loading,
        loadingMessage,
        isEmailConfirmed,
        login,
        signup,
        logout,
        switchBusiness,
        createBusiness
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
