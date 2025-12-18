import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Barber, CreateBarberData, UpdateBarberData } from '@/types';
import * as barbersService from '@/services/barbers.service';

export const useBarbers = () => {
    const { business, barbers, refreshBarbers } = useBusiness();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createBarber = async (barberData: Omit<CreateBarberData, 'business_id'>): Promise<Barber | null> => {
        if (!business) {
            setError('No business selected');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const newBarber = await barbersService.createBarber({
                ...barberData,
                business_id: business.id,
            });

            await refreshBarbers();
            return newBarber;
        } catch (err: any) {
            console.error('Error creating barber:', err);
            setError(err.message || 'Failed to create barber');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateBarber = async (barberId: string, updates: UpdateBarberData): Promise<Barber | null> => {
        setLoading(true);
        setError(null);

        try {
            const updated = await barbersService.updateBarber(barberId, updates);
            await refreshBarbers();
            return updated;
        } catch (err: any) {
            console.error('Error updating barber:', err);
            setError(err.message || 'Failed to update barber');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteBarber = async (barberId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await barbersService.deleteBarber(barberId);
            await refreshBarbers();
            return true;
        } catch (err: any) {
            console.error('Error deleting barber:', err);
            setError(err.message || 'Failed to delete barber');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getBarberServices = async (barberId: string): Promise<string[]> => {
        try {
            return await barbersService.getBarberServices(barberId);
        } catch (err: any) {
            console.error('Error fetching barber services:', err);
            return [];
        }
    };

    const hardDeleteBarber = async (barberId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await barbersService.hardDeleteBarber(barberId);
            await refreshBarbers();
            return true;
        } catch (err: any) {
            console.error('Error hard deleting barber:', err);
            setError(err.message || 'Failed to hard delete barber');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        barbers,
        loading,
        error,
        createBarber,
        updateBarber,
        deleteBarber,
        hardDeleteBarber,
        getBarberServices,
    };
};
