// Barber Types
export interface Barber {
    id: string;
    business_id: string;
    user_id?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface CreateBarberData {
    business_id: string;
    user_id?: string;
    name: string;
    email?: string;
    phone?: string;
    bio?: string;
    service_ids?: string[];
}

export interface UpdateBarberData {
    user_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    is_active?: boolean;
    display_order?: number;
    service_ids?: string[];
}

export interface BarberWithServices extends Barber {
    services: string[]; // Array of service IDs
}
