import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole | UserRole[];
    redirectTo?: string;
}

/**
 * Protected route component that requires authentication
 * and optionally a specific role
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
    redirectTo = '/login',
}) => {
    const { user, role, loading, loadingMessage, isEmailConfirmed, businesses } = useAuth();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                {loadingMessage && (
                    <p className="text-gray-600 font-medium animate-pulse">{loadingMessage}</p>
                )}
            </div>
        );
    }

    // Redirect if not authenticated
    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    // Block if email not confirmed
    if (!isEmailConfirmed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirma tu email</h2>
                    <p className="text-gray-600 mb-8">
                        Para acceder al dashboard, primero debes confirmar tu dirección de correo electrónico <strong>{user.email}</strong>.
                    </p>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">¿No recibiste el correo? Revisa tu carpeta de spam o contacta a soporte.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                        >
                            Ya lo confirmé, recargar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Check if user has a business (for dashboard access)
    if (businesses.length === 0) {
        // Check if user is a client - redirect them to home instead of showing business creation
        const userRole = user?.user_metadata?.role;

        if (userRole === 'client') {
            return <Navigate to="/appointments" replace />;
        }

        // For owners/undefined roles, show the create business prompt
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">¿Quieres crear tu barbería?</h2>
                    <p className="text-gray-600 mb-8 font-medium">
                        Configura tu negocio y empieza a recibir reservas online.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.href = '/create-business'}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-black uppercase tracking-wider shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all"
                        >
                            Crear Mi Barbería
                        </button>
                        <button
                            onClick={() => window.location.href = '/home'}
                            className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Check role if required
    if (requiredRole) {
        const hasRequiredRole = Array.isArray(requiredRole)
            ? requiredRole.includes(role!)
            : role === requiredRole;

        if (!hasRequiredRole) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
