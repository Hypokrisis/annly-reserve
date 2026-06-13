import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * Protects routes for staff (barber role).
 * Owners / admins can also access staff views.
 * - Not logged in    → /login
 * - member / client  → /client
 */
export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-space-bg">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    const allowed = role === 'owner' || role === 'admin' || role === 'barber';
    if (!allowed) return <Navigate to="/client" replace />;

    return <>{children}</>;
};
