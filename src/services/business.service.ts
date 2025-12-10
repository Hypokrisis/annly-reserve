import { supabase } from '../supabaseClient';
import type { Business, UpdateBusinessData } from '@/types';

/**
 * Get business by ID
 */
export const getBusinessById = async (businessId: string): Promise<Business | null> => {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

    if (error) {
        console.error('Error fetching business:', error);
        return null;
    }

    return data;
};

/**
 * Get business by slug
 */
export const getBusinessBySlug = async (slug: string): Promise<Business | null> => {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error fetching business:', error);
        return null;
    }

    return data;
};

/**
 * Update business information
 */
export const updateBusiness = async (
    businessId: string,
    updates: UpdateBusinessData
): Promise<Business> => {
    const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Get businesses for a user
 */
export const getUserBusinesses = async (userId: string): Promise<Business[]> => {
    const { data: userBusinesses, error: ubError } = await supabase
        .from('users_businesses')
        .select('business_id')
        .eq('user_id', userId)
        .eq('is_active', true);

    if (ubError) throw ubError;

    const businessIds = userBusinesses.map(ub => ub.business_id);

    if (businessIds.length === 0) return [];

    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds)
        .eq('is_active', true);

    if (error) throw error;
    return data || [];
};
