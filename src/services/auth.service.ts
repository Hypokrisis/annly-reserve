import { supabase } from '../supabaseClient';
import type { User, UserBusiness, UserRole } from '@/types';

export interface SignupData {
    email: string;
    password: string;
    businessName: string;
    businessSlug: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    businesses: UserBusiness[];
}

/**
 * Sign up a new user and create their business
 */
export const signup = async (data: SignupData): Promise<AuthResponse> => {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // 2. Create business safely using RPC (Security Definer)
    // This avoids RLS race conditions where session might not be ready
    const { data: businessData, error: businessError } = await supabase
        .rpc('create_business_and_membership', {
            business_name: data.businessName,
            business_slug: data.businessSlug
        });

    if (businessError) {
        console.error('RPC Error creating business:', businessError);
        // Rollback user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw businessError;
    }

    if (!businessData) {
        throw new Error('Failed to create business (No data returned from RPC)');
    }

    // 3. Fetch user businesses to update state immediately
    const { data: userBusinesses } = await supabase
        .from('users_businesses')
        .select('*')
        .eq('user_id', authData.user.id);

    return {
        user: authData.user as User,
        businesses: userBusinesses || [],
    };
};

/**
 * Login user
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to login');

    // Fetch user businesses
    const { data: userBusinesses } = await supabase
        .from('users_businesses')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('is_active', true);

    return {
        user: authData.user as User,
        businesses: userBusinesses || [],
    };
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

/**
 * Get current session
 */
export const getCurrentSession = async (): Promise<AuthResponse | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) return null;

    // Fetch user businesses
    const { data: userBusinesses } = await supabase
        .from('users_businesses')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

    return {
        user: session.user as User,
        businesses: userBusinesses || [],
    };
};

/**
 * Get user role for a specific business
 */
export const getUserRole = async (userId: string, businessId: string): Promise<UserRole | null> => {
    const { data, error } = await supabase
        .from('users_businesses')
        .select('role')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .single();

    if (error) return null;
    return data.role as UserRole;
};

/**
 * Reset password
 */
export const resetPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) throw error;
};
