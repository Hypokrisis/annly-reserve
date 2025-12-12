import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type { Business, Barber, Service } from '@/types';
import * as businessService from '@/services/business.service';
import { supabase } from '../supabaseClient';

interface BusinessContextType {
    business: Business | null;
    barbers: Barber[];
    services: Service[];
    loading: boolean;

    refreshBusiness: () => Promise<void>;
    updateBusiness: (updates: Partial<Business>) => Promise<void>;
    refreshBarbers: () => Promise<void>;
    refreshServices: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentBusiness } = useAuth();
    const [business, setBusiness] = useState<Business | null>(null);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);

    // Load business data when currentBusiness changes
    useEffect(() => {
        if (currentBusiness) {
            setBusiness(currentBusiness);
            loadBusinessData(currentBusiness.id);
        } else {
            setBusiness(null);
            setBarbers([]);
            setServices([]);
        }
    }, [currentBusiness]);

    const loadBusinessData = async (businessId: string) => {
        setLoading(true);
        try {
            await Promise.all([
                loadBarbers(businessId),
                loadServices(businessId),
            ]);
        } catch (error) {
            console.error('Error loading business data:', error);
            // Don't throw here, just log so UI can decide what to do
        } finally {
            setLoading(false);
        }
    };

    const loadBarbers = async (businessId: string) => {
        const { data, error } = await supabase
            .from('barbers')
            .select('*')
            .eq('business_id', businessId)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error loading barbers:', error);
            return;
        }

        setBarbers(data || []);
    };

    const loadServices = async (businessId: string) => {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', businessId)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error loading services:', error);
            return;
        }

        setServices(data || []);
    };

    const refreshBusiness = async () => {
        if (!business) return;

        try {
            const updated = await businessService.getBusinessById(business.id);
            if (updated) {
                setBusiness(updated);
            }
        } catch (error) {
            console.error('Error refreshing business:', error);
            throw error;
        }
    };

    const updateBusiness = async (updates: Partial<Business>) => {
        if (!business) return;

        try {
            const updated = await businessService.updateBusiness(business.id, updates);
            setBusiness(updated);
        } catch (error) {
            console.error('Error updating business:', error);
            throw error;
        }
    };

    const refreshBarbers = async () => {
        if (!business) return;
        await loadBarbers(business.id);
    };

    const refreshServices = async () => {
        if (!business) return;
        await loadServices(business.id);
    };

    const value: BusinessContextType = {
        business,
        barbers,
        services,
        loading,
        refreshBusiness,
        updateBusiness,
        refreshBarbers,
        refreshServices,
    };

    return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};
