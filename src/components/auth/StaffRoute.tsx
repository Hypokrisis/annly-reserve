import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthStatusScreen } from '@/components/common/AuthStatusScreen';

/**
 * Protects routes for staff (barber role).
 * Owners / admins can also access staff views.
 * - Not logged in    → /login
 * - member / client  → /client
 */
export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, loading, authError, retryBootstrap } = useAuth();

    if (loading || authError) {
        return <AuthStatusScreen error={authError} onRetry={retryBootstrap} />;
    }

    if (!user) return <Navigate to="/login" replace />;

    const allowed = role === 'owner' || role === 'admin' || role === 'barber';
    if (!allowed) return <Navigate to="/client" replace />;

    return <>{children}</>;
};
