import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthStatusScreen } from '@/components/common/AuthStatusScreen';

/** Requires only authentication — no role or business needed. */
export const AuthOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, authError, retryBootstrap } = useAuth();

    if (loading || authError) {
        return <AuthStatusScreen error={authError} onRetry={retryBootstrap} />;
    }

    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
};
