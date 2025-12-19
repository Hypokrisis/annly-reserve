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
 * Sign up a new user and automatically create their business
 */
export const signup = async (data: {
    email: string;
    password: string;
    businessName: string;
    slug?: string;
    phone?: string;
}): Promise<void> => {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
    });

    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error("Error al crear usuario");

    let businessId: string | null = null;

    try {
        // 2. Insert into businesses
        const { data: business, error: bError } = await supabase
            .from('businesses')
            .insert({
                owner_id: user.id,
                name: data.businessName,
                slug: data.slug || data.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                phone: data.phone,
                is_active: true
            })
            .select()
            .single();

        if (bError) throw bError;
        businessId = business.id;

        // 3. Insert into users_businesses (Membership)
        const { error: mError } = await supabase
            .from('users_businesses')
            .insert({
                user_id: user.id,
                business_id: businessId,
                role: 'admin'
            });

        if (mError) throw mError;

    } catch (err: any) {
        console.error("Signup secondary steps failed:", err);

        // Manual Rollback: Attempt to delete the business if membership failed
        if (businessId) {
            await supabase.from('businesses').delete().eq('id', businessId);
        }

        throw new Error(`Error al configurar el negocio: ${err.message || 'Inténtalo de nuevo.'}`);
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
