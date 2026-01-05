import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

const EmailConfirmationUI = ({ email }: { email: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Confirma tu email</h2>
            <p className="text-gray-600 mb-8">
                Para acceder a todas las funciones, primero debes confirmar tu dirección de correo electrónico{' '}
                <strong>{email}</strong>.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg shadow-black/10"
            >
                Ya lo confirmé, recargar
            </button>
        </div>
    </div>
);

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, loading, isEmailConfirmed } = useAuth();
    const location = useLocation();

    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isEmailConfirmed) {
        return <EmailConfirmationUI email={user.email || ''} />;
    }

    return <>{children}</>;
};
