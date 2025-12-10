import { supabase } from '../supabaseClient';
import { generateTimeSlots, parseTime, addMinutes, formatTime } from '@/utils';
import type { Schedule, Appointment, Service, Barber } from '@/types';

export interface AvailableSlot {
    time: string;
    barber_id: string;
    barber_name: string;
}

export interface AvailabilityParams {
    businessId: string;
    serviceId: string;
    barberId?: string; // Optional - if not provided, check all barbers
    date: string; // YYYY-MM-DD
}

/**
 * Calculate available time slots for a service on a specific date
 */
export const calculateAvailability = async (params: AvailabilityParams): Promise<AvailableSlot[]> => {
    const { businessId, serviceId, barberId, date } = params;

    // 1. Get service details
    const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

    if (serviceError || !service) {
        throw new Error('Service not found');
    }

    // 2. Get business settings
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

    if (businessError || !business) {
        throw new Error('Business not found');
    }

    const bufferMinutes = business.booking_buffer_minutes || 0;

    // 3. Get barbers who offer this service
    let barberIds: string[] = [];

    if (barberId) {
        // Check if specified barber offers this service
        const { data: barberService } = await supabase
            .from('barbers_services')
            .select('barber_id')
            .eq('barber_id', barberId)
            .eq('service_id', serviceId)
            .single();

        if (barberService) {
            barberIds = [barberId];
        }
    } else {
        // Get all barbers who offer this service
        const { data: barberServices } = await supabase
            .from('barbers_services')
            .select('barber_id')
            .eq('service_id', serviceId);

        barberIds = barberServices?.map(bs => bs.barber_id) || [];
    }

    if (barberIds.length === 0) {
        return [];
    }

    // 4. Get barber details
    const { data: barbers } = await supabase
        .from('barbers')
        .select('*')
        .in('id', barberIds)
        .eq('is_active', true);

    if (!barbers || barbers.length === 0) {
        return [];
    }

    // 5. Get day of week
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();

    // 6. Calculate availability for each barber
    const allSlots: AvailableSlot[] = [];

    for (const barber of barbers) {
        const barberSlots = await calculateBarberAvailability(
            barber,
            dayOfWeek,
            date,
            service,
            bufferMinutes
        );

        allSlots.push(...barberSlots);
    }

    // 7. Sort by time
    allSlots.sort((a, b) => {
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        return timeA.getTime() - timeB.getTime();
    });

    // 8. Filter out past times if date is today
    const now = new Date();
    const isToday = new Date(date + 'T00:00:00').toDateString() === now.toDateString();

    if (isToday) {
        return allSlots.filter(slot => {
            const slotTime = parseTime(slot.time);
            return slotTime > now;
        });
    }

    return allSlots;
};

/**
 * Calculate availability for a specific barber
 */
async function calculateBarberAvailability(
    barber: Barber,
    dayOfWeek: number,
    date: string,
    service: Service,
    bufferMinutes: number
): Promise<AvailableSlot[]> {
    // 1. Get barber's schedule for this day
    const { data: schedule } = await supabase
        .from('schedules')
        .select('*')
        .eq('barber_id', barber.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();

    if (!schedule) {
        return []; // Barber doesn't work this day
    }

    // 2. Get existing appointments for this barber on this date
    const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barber.id)
        .eq('appointment_date', date)
        .eq('status', 'confirmed');

    const existingAppointments = appointments || [];

    // 3. Generate all possible time slots
    const serviceDuration = service.duration_minutes;
    const totalSlotDuration = serviceDuration + bufferMinutes;

    const allSlots = generateTimeSlots(
        schedule.start_time,
        schedule.end_time,
        totalSlotDuration,
        15 // 15-minute intervals
    );

    // 4. Filter out occupied slots
    const availableSlots: AvailableSlot[] = [];

    for (const slot of allSlots) {
        const slotStart = parseTime(slot);
        const slotEnd = addMinutes(slotStart, serviceDuration);

        // Check if this slot overlaps with any existing appointment
        const hasConflict = existingAppointments.some(apt => {
            const aptStart = parseTime(apt.start_time);
            const aptEnd = parseTime(apt.end_time);

            // Add buffer to appointment end time
            const aptEndWithBuffer = addMinutes(aptEnd, bufferMinutes);

            // Check for overlap
            return slotStart < aptEndWithBuffer && slotEnd > aptStart;
        });

        if (!hasConflict) {
            availableSlots.push({
                time: slot,
                barber_id: barber.id,
                barber_name: barber.name,
            });
        }
    }

    return availableSlots;
}

/**
 * Check if a specific time slot is available
 */
export const isSlotAvailable = async (
    barberId: string,
    serviceId: string,
    date: string,
    time: string
): Promise<boolean> => {
    // Get service duration
    const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single();

    if (!service) return false;

    // Get existing appointments
    const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barberId)
        .eq('appointment_date', date)
        .eq('status', 'confirmed');

    if (!appointments) return true;

    const slotStart = parseTime(time);
    const slotEnd = addMinutes(slotStart, service.duration_minutes);

    // Check for conflicts
    const hasConflict = appointments.some(apt => {
        const aptStart = parseTime(apt.start_time);
        const aptEnd = parseTime(apt.end_time);

        return slotStart < aptEnd && slotEnd > aptStart;
    });

    return !hasConflict;
};
