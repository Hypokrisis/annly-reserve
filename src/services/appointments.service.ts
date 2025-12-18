import { supabase } from '../supabaseClient';
import type { Appointment, CreateAppointmentData, UpdateAppointmentData, AppointmentFilters } from '@/types';

/**
 * Get appointments with filters
 */
export const getAppointments = async (filters: AppointmentFilters): Promise<Appointment[]> => {
    let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (filters.business_id) {
        query = query.eq('business_id', filters.business_id);
    }

    if (filters.barber_id) {
        query = query.eq('barber_id', filters.barber_id);
    }

    if (filters.date) {
        query = query.eq('appointment_date', filters.date);
    }

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.customer_email) {
        query = query.eq('customer_email', filters.customer_email);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (appointmentId: string): Promise<Appointment | null> => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

    if (error) {
        console.error('Error fetching appointment:', error);
        return null;
    }

    return data;
};

/**
 * Create new appointment
 */
export const createAppointment = async (appointmentData: CreateAppointmentData): Promise<Appointment> => {
    // Get service duration to calculate end_time
    const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', appointmentData.service_id)
        .single();

    if (!service) throw new Error('Service not found');

    // Calculate end_time
    const [hours, minutes] = appointmentData.start_time.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);
    const end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    const { data, error } = await supabase
        .from('appointments')
        .insert({
            ...appointmentData,
            end_time,
            status: 'confirmed',
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update appointment
 */
export const updateAppointment = async (
    appointmentId: string,
    updates: UpdateAppointmentData
): Promise<Appointment> => {
    const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (appointmentId: string, reason?: string): Promise<void> => {
    const { error } = await supabase
        .from('appointments')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
        })
        .eq('id', appointmentId);

    if (error) throw error;
};

/**
 * Reschedule appointment
 */
export const rescheduleAppointment = async (
    appointmentId: string,
    newDate: string,
    newStartTime: string
): Promise<Appointment> => {
    // Get appointment to get service duration
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    // Get service duration
    const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', appointment.service_id!)
        .single();

    if (!service) throw new Error('Service not found');

    // Calculate new end_time
    const [hours, minutes] = newStartTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);
    const newEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    const { data, error } = await supabase
        .from('appointments')
        .update({
            appointment_date: newDate,
            start_time: newStartTime,
            end_time: newEndTime,
        })
        .eq('id', appointmentId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (
    appointmentId: string,
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
): Promise<void> => {
    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

    if (error) throw error;
};

/**
 * Get active appointments for a customer email
 */
export const getCustomerAppointments = async (email: string): Promise<Appointment[]> => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            business:businesses(id, name, slug)
        `)
        .ilike('customer_email', email.trim())
        .in('status', ['confirmed', 'pending'])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
};
