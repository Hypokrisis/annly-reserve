import { supabase } from '../supabaseClient';
import type { Schedule, UpdateScheduleData } from '@/types';

/**
 * Get schedules for a barber
 */
export const getBarberSchedules = async (barberId: string): Promise<Schedule[]> => {
    const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('barber_id', barberId)
        .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Update or create schedule for a barber on a specific day
 */
export const upsertSchedule = async (
    barberId: string,
    dayOfWeek: number,
    scheduleData: Omit<UpdateScheduleData, 'day_of_week'>
): Promise<Schedule> => {
    // Check if schedule exists
    const { data: existing } = await supabase
        .from('schedules')
        .select('*')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek)
        .single();

    if (existing) {
        // Update existing
        const { data, error } = await supabase
            .from('schedules')
            .update({
                start_time: scheduleData.start_time,
                end_time: scheduleData.end_time,
                is_active: scheduleData.is_active ?? true,
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        // Create new
        const { data, error } = await supabase
            .from('schedules')
            .insert({
                barber_id: barberId,
                day_of_week: dayOfWeek,
                start_time: scheduleData.start_time,
                end_time: scheduleData.end_time,
                is_active: scheduleData.is_active ?? true,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

/**
 * Update multiple schedules for a barber
 */
export const updateBarberSchedules = async (
    barberId: string,
    schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>
): Promise<void> => {
    for (const schedule of schedules) {
        await upsertSchedule(barberId, schedule.dayOfWeek, {
            start_time: schedule.startTime,
            end_time: schedule.endTime,
            is_active: schedule.isActive,
        });
    }
};

/**
 * Delete schedule for a specific day
 */
export const deleteSchedule = async (barberId: string, dayOfWeek: number): Promise<void> => {
    const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek);

    if (error) throw error;
};

/**
 * Toggle schedule active status
 */
export const toggleScheduleActive = async (scheduleId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
        .from('schedules')
        .update({ is_active: isActive })
        .eq('id', scheduleId);

    if (error) throw error;
};
