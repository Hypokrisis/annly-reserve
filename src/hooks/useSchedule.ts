import { useState, useEffect } from 'react';
import type { Schedule } from '@/types';
import * as schedulesService from '@/services/schedules.service';

export const useSchedule = (barberId: string | null) => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (barberId) {
            loadSchedules();
        } else {
            setSchedules([]);
        }
    }, [barberId]);

    const loadSchedules = async () => {
        if (!barberId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await schedulesService.getBarberSchedules(barberId);
            setSchedules(data);
        } catch (err: any) {
            console.error('Error loading schedules:', err);
            setError(err.message || 'Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    const updateSchedules = async (
        scheduleData: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>
    ): Promise<boolean> => {
        if (!barberId) {
            setError('No barber selected');
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            await schedulesService.updateBarberSchedules(barberId, scheduleData);
            await loadSchedules();
            return true;
        } catch (err: any) {
            console.error('Error updating schedules:', err);
            setError(err.message || 'Failed to update schedules');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toggleDayActive = async (dayOfWeek: number, isActive: boolean): Promise<boolean> => {
        const schedule = schedules.find(s => s.day_of_week === dayOfWeek);

        if (!schedule) {
            setError('Schedule not found');
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            await schedulesService.toggleScheduleActive(schedule.id, isActive);
            await loadSchedules();
            return true;
        } catch (err: any) {
            console.error('Error toggling schedule:', err);
            setError(err.message || 'Failed to toggle schedule');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        schedules,
        loading,
        error,
        updateSchedules,
        toggleDayActive,
        refreshSchedules: loadSchedules,
    };
};
