import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthStatusScreen } from '@/components/common/AuthStatusScreen';
import { AuthGuard } from '@/components/auth/AuthGuard';

/**
 * Protects routes for owner / admin only.
 * - Not logged in          → /login
 * - Email not confirmed    → email confirmation screen
 * - barber role            → /staff
 * - member / no role       → /client
 * - no business linked yet → /create-business
 */
export const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, loading, currentBusiness, authError, retryBootstrap } = useAuth();

    if (loading || authError) {
        return <AuthStatusScreen error={authError} onRetry={retryBootstrap} />;
    }

    if (!user) return <Navigate to="/login" replace />;

    if (role === 'barber') return <Navigate to="/staff" replace />;

    if (role !== 'owner' && role !== 'admin') return <Navigate to="/client" replace />;

    if (!currentBusiness) return <Navigate to="/create-business" replace />;

    return <AuthGuard>{children}</AuthGuard>;
};
