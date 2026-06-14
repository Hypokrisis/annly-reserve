import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import type { Business, Barber, Service } from '@/types';
import * as businessService from '@/services/business.service';
import { supabase } from '../supabaseClient';

export interface SubscriptionTier {
    id: string;
    name: string;
    price_monthly: number;
    stripe_price_id: string | null;
    max_barbers: number;
    max_monthly_appointments: number;
    max_whatsapp_messages: number;
    has_whatsapp_bot: boolean;
    has_stripe_deposits: boolean;
    has_inventory: boolean;
    has_advanced_reports: boolean;
}

export interface Subscription {
    id: string;
    business_id: string;
    tier_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    whatsapp_messages_sent: number;
    subscription_tiers?: SubscriptionTier;
}

interface BusinessContextType {
    business: Business | null;
    barbers: Barber[];
    services: Service[];
    loading: boolean;
    subscription: Subscription | null;
    monthlyAppointmentsCount: number;
    loadingSubscription: boolean;

    refreshBusiness: () => Promise<void>;
    updateBusiness: (updates: Partial<Business>) => Promise<void>;
    refreshBarbers: () => Promise<void>;
    refreshServices: () => Promise<void>;
    refreshSubscription: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentBusiness } = useAuth();
    const [business, setBusiness] = useState<Business | null>(null);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [monthlyAppointmentsCount, setMonthlyAppointmentsCount] = useState(0);
    const [loadingSubscription, setLoadingSubscription] = useState(false);

    // Load business data when currentBusiness changes
    useEffect(() => {
        if (currentBusiness) {
            setBusiness(currentBusiness);
            loadBusinessData(currentBusiness.id);
        } else {
            setBusiness(null);
            setBarbers([]);
            setServices([]);
            setSubscription(null);
            setMonthlyAppointmentsCount(0);
        }
    }, [currentBusiness]);

    const loadBusinessData = async (businessId: string) => {
        setLoading(true);
        try {
            await Promise.all([
                loadBarbers(businessId),
                loadServices(businessId),
                loadSubscriptionAndStats(businessId),
            ]);
        } catch (error) {
            console.error('Error loading business data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSubscriptionAndStats = async (businessId: string) => {
        setLoadingSubscription(true);
        try {
            // 1. Fetch Subscription Joined with Tiers
            const { data: subData, error: subErr } = await supabase
                .from('business_subscriptions')
                .select('*, subscription_tiers(*)')
                .eq('business_id', businessId)
                .maybeSingle();

            if (subErr) throw subErr;
            setSubscription(subData as unknown as Subscription || null);

            // 2. Fetch Completed & Confirmed Appointments Count for Current Month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

            const { count, error: countErr } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .gte('appointment_date', startOfMonthStr)
                .in('status', ['confirmed', 'completed']);

            if (countErr) throw countErr;
            setMonthlyAppointmentsCount(count || 0);

        } catch (error) {
            console.error('Error loading subscription or usage stats:', error);
        } finally {
            setLoadingSubscription(false);
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

    const refreshSubscription = async () => {
        if (!business) return;
        await loadSubscriptionAndStats(business.id);
    };

    // Memoized so consumers only re-render when business STATE changes.
    const value: BusinessContextType = useMemo(() => ({
        business,
        barbers,
        services,
        loading,
        subscription,
        monthlyAppointmentsCount,
        loadingSubscription,
        refreshBusiness,
        updateBusiness,
        refreshBarbers,
        refreshServices,
        refreshSubscription,
    }), [business, barbers, services, loading, subscription, monthlyAppointmentsCount, loadingSubscription]);

    return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};

