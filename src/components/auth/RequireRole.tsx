import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { UserRole } from '@/types';

interface RequireRoleProps {
    children: React.ReactNode;
    requiredRole: UserRole | UserRole[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, requiredRole }) => {
    const { role } = useAuth();
    const navigate = useNavigate();

    const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(role!)
        : role === requiredRole;

    if (!hasRequiredRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">No tienes permisos</h2>
                    <p className="text-gray-600 mb-6">No tienes el rol requerido para ver esta página.</p>
                    <button onClick={() => navigate(-1)} className="text-indigo-600 font-bold hover:underline">
                        Volver atrás
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
