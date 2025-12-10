// Appointment Types
export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
    id: string;
    business_id: string;
    barber_id: string;
    service_id?: string;

    // Customer information
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_notes?: string;

    // Appointment information
    appointment_date: string; // YYYY-MM-DD
    start_time: string; // HH:MM
    end_time: string; // HH:MM

    // Status
    status: AppointmentStatus;

    // Metadata
    created_at: string;
    updated_at: string;
    cancelled_at?: string;
    cancellation_reason?: string;
}

export interface CreateAppointmentData {
    business_id: string;
    barber_id: string;
    service_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_notes?: string;
    appointment_date: string;
    start_time: string;
}

export interface UpdateAppointmentData {
    status?: AppointmentStatus;
    appointment_date?: string;
    start_time?: string;
    cancellation_reason?: string;
}

export interface AppointmentFilters {
    business_id?: string;
    barber_id?: string;
    date?: string;
    status?: AppointmentStatus;
    customer_email?: string;
}

export interface AppointmentWithDetails extends Appointment {
    barber_name?: string;
    service_name?: string;
    service_price?: number;
}
