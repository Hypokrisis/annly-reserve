import { useState, useEffect } from 'react';
import type { AvailableSlot, AvailabilityParams } from '@/services/availability.service';
import * as availabilityService from '@/services/availability.service';

export const useAvailability = (params: AvailabilityParams | null) => {
    const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (params) {
            loadAvailability();
        } else {
            setAvailableSlots([]);
        }
    }, [params?.businessId, params?.serviceId, params?.barberId, params?.date]);

    const loadAvailability = async () => {
        if (!params) return;

        setLoading(true);
        setError(null);

        try {
            const slots = await availabilityService.calculateAvailability(params);
            setAvailableSlots(slots);
        } catch (err: any) {
            console.error('Error loading availability:', err);
            setError(err.message || 'Failed to load availability');
            setAvailableSlots([]);
        } finally {
            setLoading(false);
        }
    };

    return {
        availableSlots,
        loading,
        error,
        refreshAvailability: loadAvailability,
    };
};
