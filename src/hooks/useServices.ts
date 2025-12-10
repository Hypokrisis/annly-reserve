import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Service, CreateServiceData, UpdateServiceData } from '@/types';
import * as servicesService from '@/services/services.service';

export const useServices = () => {
    const { business, services, refreshServices } = useBusiness();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createService = async (serviceData: Omit<CreateServiceData, 'business_id'>): Promise<Service | null> => {
        if (!business) {
            setError('No business selected');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const newService = await servicesService.createService({
                ...serviceData,
                business_id: business.id,
            });

            await refreshServices();
            return newService;
        } catch (err: any) {
            console.error('Error creating service:', err);
            setError(err.message || 'Failed to create service');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateService = async (serviceId: string, updates: UpdateServiceData): Promise<Service | null> => {
        setLoading(true);
        setError(null);

        try {
            const updated = await servicesService.updateService(serviceId, updates);
            await refreshServices();
            return updated;
        } catch (err: any) {
            console.error('Error updating service:', err);
            setError(err.message || 'Failed to update service');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteService = async (serviceId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await servicesService.deleteService(serviceId);
            await refreshServices();
            return true;
        } catch (err: any) {
            console.error('Error deleting service:', err);
            setError(err.message || 'Failed to delete service');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const reorderServices = async (serviceIds: string[]): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await servicesService.reorderServices(serviceIds);
            await refreshServices();
            return true;
        } catch (err: any) {
            console.error('Error reordering services:', err);
            setError(err.message || 'Failed to reorder services');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        services,
        loading,
        error,
        createService,
        updateService,
        deleteService,
        reorderServices,
    };
};
