import type { Business } from './business.types';

export interface User {
    id: string;
    email: string;
    created_at: string;
    email_confirmed_at?: string;
}

export type UserRole = 'owner' | 'admin' | 'staff';

export interface UserBusiness {
    id: string;
    user_id: string;
    business_id: string;
    role: UserRole;
    created_at: string;
    is_active: boolean;
    business?: Business;
}
