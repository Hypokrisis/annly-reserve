// User and Authentication Types
export interface User {
    id: string;
    email: string;
    created_at: string;
}

export type UserRole = 'owner' | 'admin' | 'staff';

export interface UserBusiness {
    id: string;
    user_id: string;
    business_id: string;
    role: UserRole;
    created_at: string;
    is_active: boolean;
}
