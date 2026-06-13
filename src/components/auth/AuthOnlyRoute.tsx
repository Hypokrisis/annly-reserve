import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/** Requires only authentication — no role or business needed. */
export const AuthOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-space-bg">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
};
