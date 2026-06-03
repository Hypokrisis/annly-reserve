import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

const EmailConfirmationUI = ({ email }: { email: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
        <div className="max-w-md w-full bg-space-card rounded-3xl shadow-xl p-8 text-center border border-space-border">
            <div className="w-16 h-16 bg-space-yellow/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-space-yellow" />
            </div>
            <h2 className="text-2xl font-bold text-space-text mb-4 tracking-tight">Confirma tu email</h2>
            <p className="text-space-muted mb-8">
                Para acceder a todas las funciones, primero debes confirmar tu dirección de correo electrónico{' '}
                <strong className="text-space-text">{email}</strong>.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="w-full btn-primary py-4"
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
