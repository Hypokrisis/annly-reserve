// Service Types
export interface Service {
    id: string;
    business_id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface CreateServiceData {
    business_id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
}

export interface UpdateServiceData {
    name?: string;
    description?: string;
    duration_minutes?: number;
    price?: number;
    is_active?: boolean;
    display_order?: number;
}
