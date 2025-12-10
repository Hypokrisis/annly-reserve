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

    // Initialize auth state
    useEffect(() => {
        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await loadUserData(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setBusinesses([]);
                setCurrentBusiness(null);
                setRole(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Load user data when businesses change
    useEffect(() => {
        if (businesses.length > 0 && !currentBusiness) {
            // Auto-select first business
            const firstBusinessId = businesses[0].business_id;
            switchBusiness(firstBusinessId);
        }
    }, [businesses]);

    const initializeAuth = async () => {
        try {
            const session = await authService.getCurrentSession();
            if (session) {
                setUser(session.user);
                setBusinesses(session.businesses);
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserData = async (userId: string) => {
        try {
            const { data: userBusinesses } = await supabase
                .from('users_businesses')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);

            setBusinesses(userBusinesses || []);
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    };

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const response = await authService.login({ email, password });
            setUser(response.user);
            setBusinesses(response.businesses);
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
            const response = await authService.signup(data);
            setUser(response.user);
            setBusinesses(response.businesses);
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
            // Fetch business details
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();

            if (businessError) throw businessError;

            // Get user role for this business
            const userBusiness = businesses.find(b => b.business_id === businessId);
            const userRole = userBusiness?.role || null;

            setCurrentBusiness(businessData);
            setRole(userRole);

            // Store in localStorage for persistence
            localStorage.setItem('currentBusinessId', businessId);
        } catch (error) {
            console.error('Failed to switch business:', error);
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
