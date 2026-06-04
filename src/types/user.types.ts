import type { Business } from './business.types';

export interface User {
    id: string;
    email: string;
    created_at: string;
    email_confirmed_at?: string;
    user_metadata?: {
        role?: 'client' | 'owner';
        full_name?: string;
        phone?: string;
        [key: string]: any;
    };
}

// DB values in users_businesses.role
export type UserRole = 'owner' | 'admin' | 'barber' | 'member';

// Simplified app-level role used for routing decisions
export type AppRole = 'owner' | 'staff' | 'client';

export interface UserBusiness {
    id: string;
    user_id: string;
    business_id: string;
    role: UserRole;
    created_at: string;
    is_active: boolean;
    business?: Business;
}
