import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthStatusScreen } from '@/components/common/AuthStatusScreen';

/**
 * Protects routes for any authenticated user (client area).
 * - Not logged in → /login
 */
export const ClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, authError, retryBootstrap } = useAuth();

    if (loading || authError) {
        return <AuthStatusScreen error={authError} onRetry={retryBootstrap} />;
    }

    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
};
