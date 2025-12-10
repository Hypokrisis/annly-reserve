// Business Types
export interface Business {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone: string;
    logo_url?: string;

    // Configuration
    booking_buffer_minutes: number;
    cancellation_window_hours: number;
    max_advance_booking_days: number;

    // Metadata
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface CreateBusinessData {
    name: string;
    slug: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
}

export interface UpdateBusinessData {
    name?: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    booking_buffer_minutes?: number;
    cancellation_window_hours?: number;
    max_advance_booking_days?: number;
}
