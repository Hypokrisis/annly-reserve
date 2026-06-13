import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * Protects routes for owner / admin only.
 * - Not logged in          → /login
 * - barber role            → /staff
 * - member / no role       → /client
 * - no business linked yet → /create-business
 */
export const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, loading, currentBusiness } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-space-bg">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    if (role === 'barber') return <Navigate to="/staff" replace />;

    if (role !== 'owner' && role !== 'admin') return <Navigate to="/client" replace />;

    if (!currentBusiness) return <Navigate to="/create-business" replace />;

    return <>{children}</>;
};
