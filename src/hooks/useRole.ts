import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types';

/**
 * Maps DB role → AppRole and provides the correct redirect path.
 * DB roles:  owner | admin | barber | member
 * App roles: owner | staff  | client
 */
export function useRole() {
    const { user, role, loading, currentBusiness } = useAuth();

    const appRole: AppRole | null = !user
        ? null
        : role === 'owner' || role === 'admin'
        ? 'owner'
        : role === 'barber'
        ? 'staff'
        : 'client'; // member or null → client

    const redirectPath =
        appRole === 'owner' ? '/dashboard' :
        appRole === 'staff' ? '/staff' :
        '/client';

    return {
        appRole,
        redirectPath,
        loading,
        isOwner: appRole === 'owner',
        isStaff: appRole === 'staff',
        isClient: appRole === 'client' || appRole === null,
        hasAnyBusiness: !!currentBusiness,
    };
}
