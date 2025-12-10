import { supabase } from '../supabaseClient';
import type { Barber, CreateBarberData, UpdateBarberData } from '@/types';

/**
 * Get all barbers for a business
 */
export const getBarbers = async (businessId: string): Promise<Barber[]> => {
    const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Get barber by ID
 */
export const getBarberById = async (barberId: string): Promise<Barber | null> => {
    const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .single();

    if (error) {
        console.error('Error fetching barber:', error);
        return null;
    }

    return data;
};

/**
 * Create new barber
 */
export const createBarber = async (barberData: CreateBarberData): Promise<Barber> => {
    const { service_ids, ...barberInfo } = barberData;

    // Create barber
    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .insert(barberInfo)
        .select()
        .single();

    if (barberError) throw barberError;

    // Assign services if provided
    if (service_ids && service_ids.length > 0) {
        await assignServicesToBarber(barber.id, service_ids);
    }

    return barber;
};

/**
 * Update barber
 */
export const updateBarber = async (
    barberId: string,
    updates: UpdateBarberData
): Promise<Barber> => {
    const { service_ids, ...barberUpdates } = updates;

    // Update barber info
    const { data, error } = await supabase
        .from('barbers')
        .update(barberUpdates)
        .eq('id', barberId)
        .select()
        .single();

    if (error) throw error;

    // Update services if provided
    if (service_ids !== undefined) {
        await assignServicesToBarber(barberId, service_ids);
    }

    return data;
};

/**
 * Delete barber (soft delete by setting is_active = false)
 */
export const deleteBarber = async (barberId: string): Promise<void> => {
    const { error } = await supabase
        .from('barbers')
        .update({ is_active: false })
        .eq('id', barberId);

    if (error) throw error;
};

/**
 * Assign services to barber
 */
export const assignServicesToBarber = async (
    barberId: string,
    serviceIds: string[]
): Promise<void> => {
    // Delete existing assignments
    await supabase
        .from('barbers_services')
        .delete()
        .eq('barber_id', barberId);

    // Create new assignments
    if (serviceIds.length > 0) {
        const assignments = serviceIds.map(serviceId => ({
            barber_id: barberId,
            service_id: serviceId,
        }));

        const { error } = await supabase
            .from('barbers_services')
            .insert(assignments);

        if (error) throw error;
    }
};

/**
 * Get services for a barber
 */
export const getBarberServices = async (barberId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('barbers_services')
        .select('service_id')
        .eq('barber_id', barberId);

    if (error) throw error;
    return data?.map(item => item.service_id) || [];
};
