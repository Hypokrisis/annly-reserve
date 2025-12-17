import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface Permissions {
    canEditBusiness: boolean;
    canManageBarbers: boolean;
    canManageServices: boolean;
    canViewAllAppointments: boolean;
    canInviteUsers: boolean;
    canDeleteUsers: boolean;
    canEditAllSchedules: boolean;
    canEditOwnSchedule: boolean;
}

export const usePermissions = (): Permissions => {
    const { role } = useAuth();

    const isOwner = role === 'owner';
    const isAdmin = role === 'admin';
    const isStaff = role === 'staff';
    const isOwnerOrAdmin = isOwner || isAdmin;

    return {
        canEditBusiness: isOwnerOrAdmin,
        canManageBarbers: isOwnerOrAdmin,
        canManageServices: isOwnerOrAdmin,
        canViewAllAppointments: isOwnerOrAdmin || isStaff, // Staff can view (filtered by RLS)
        canInviteUsers: isOwnerOrAdmin,
        canDeleteUsers: isOwner,
        canEditAllSchedules: isOwnerOrAdmin,
        canEditOwnSchedule: true, // All roles can edit their own schedule
    };
};

/**
 * Check if user has a specific role
 */
export const useHasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    const { role } = useAuth();

    if (!role) return false;

    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(role);
    }

    return role === requiredRole;
};

/**
 * Check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
    const { user } = useAuth();
    return user !== null;
};
