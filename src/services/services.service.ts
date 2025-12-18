import { supabase } from '../supabaseClient';
import type { Service, CreateServiceData, UpdateServiceData } from '@/types';

/**
 * Get all services for a business
 */
export const getServices = async (businessId: string): Promise<Service[]> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Get service by ID
 */
export const getServiceById = async (serviceId: string): Promise<Service | null> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

    if (error) {
        console.error('Error fetching service:', error);
        return null;
    }

    return data;
};

/**
 * Create new service
 */
export const createService = async (serviceData: CreateServiceData): Promise<Service> => {
    const { data, error } = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update service
 */
export const updateService = async (
    serviceId: string,
    updates: UpdateServiceData
): Promise<Service> => {
    const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete service (soft delete by setting is_active = false)
 */
export const deleteService = async (serviceId: string): Promise<void> => {
    const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', serviceId);

    if (error) throw error;
};

/**
 * Hard delete service
 */
export const hardDeleteService = async (serviceId: string): Promise<void> => {
    // Delete associations first
    await supabase
        .from('barbers_services')
        .delete()
        .eq('service_id', serviceId);

    // Hard delete service
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

    if (error) throw error;
};

/**
 * Reorder services
 */
export const reorderServices = async (serviceIds: string[]): Promise<void> => {
    const updates = serviceIds.map((id, index) => ({
        id,
        display_order: index,
    }));

    for (const update of updates) {
        await supabase
            .from('services')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
    }
};
