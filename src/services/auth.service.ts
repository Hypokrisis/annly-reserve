import { supabase } from '../supabaseClient';
import type { User, UserBusiness, UserRole, Business } from '@/types';

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    businesses: UserBusiness[];
}

/**
 * Sign up a new user (normal customer account)
 * No business is created - users can upgrade later
 */
export const signup = async (data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
}): Promise<void> => {
    // Create user account
    const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            emailRedirectTo: `${window.location.origin}/login`,
        },
    });

    if (error) throw error;

    // Create profile if name or phone provided
    if (authData.user && (data.full_name || data.phone)) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                full_name: data.full_name || '',
                phone: data.phone || '',
            });

        if (profileError) {
            console.warn('Profile creation failed:', profileError);
            // Don't throw - user is created, profile can be added later
        }
    }
};

/**
 * Create a new business for the authenticated user
 */
export const createBusiness = async (name: string, slug: string): Promise<Business> => {
    const { data, error } = await supabase
        .rpc('create_business_and_membership', {
            business_name: name,
            business_slug: slug
        });

    if (error) throw error;
    if (!data) throw new Error('Failed to create business');

    return data;
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
        .eq('user_id', authData.user.id);

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
        .eq('user_id', session.user.id);

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
