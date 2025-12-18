import { useState } from 'react';
import type { Appointment, CreateAppointmentData, AppointmentFilters } from '@/types';
import * as appointmentsService from '@/services/appointments.service';

export const useAppointments = (initialFilters?: AppointmentFilters) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAppointments = async (filters?: AppointmentFilters) => {
        setLoading(true);
        setError(null);

        try {
            const data = await appointmentsService.getAppointments(filters || initialFilters || {});
            setAppointments(data);
        } catch (err: any) {
            console.error('Error fetching appointments:', err);
            setError(err.message || 'Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    };

    const createAppointment = async (data: CreateAppointmentData): Promise<Appointment | null> => {
        setLoading(true);
        setError(null);

        try {
            const newAppointment = await appointmentsService.createAppointment(data);
            await fetchAppointments();
            return newAppointment;
        } catch (err: any) {
            console.error('Error creating appointment:', err);
            setError(err.message || 'Failed to create appointment');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const cancelAppointment = async (appointmentId: string, reason?: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await appointmentsService.cancelAppointment(appointmentId, reason);
            await fetchAppointments();
            return true;
        } catch (err: any) {
            console.error('Error cancelling appointment:', err);
            setError(err.message || 'Failed to cancel appointment');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const rescheduleAppointment = async (
        appointmentId: string,
        newDate: string,
        newTime: string
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await appointmentsService.rescheduleAppointment(appointmentId, newDate, newTime);
            await fetchAppointments();
            return true;
        } catch (err: any) {
            console.error('Error rescheduling appointment:', err);
            setError(err.message || 'Failed to reschedule appointment');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateAppointmentStatus = async (
        appointmentId: string,
        status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await appointmentsService.updateAppointmentStatus(appointmentId, status);
            await fetchAppointments();
            return true;
        } catch (err: any) {
            console.error('Error updating appointment status:', err);
            setError(err.message || 'Failed to update appointment status');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async (businessId: string): Promise<number> => {
        setLoading(true);
        setError(null);

        try {
            const count = await appointmentsService.clearAppointmentHistory(businessId);
            await fetchAppointments();
            return count;
        } catch (err: any) {
            console.error('Error clearing history:', err);
            setError(err.message || 'Failed to clear history');
            return 0;
        } finally {
            setLoading(false);
        }
    };

    return {
        appointments,
        loading,
        error,
        fetchAppointments,
        createAppointment,
        cancelAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        clearHistory,
    };
};
