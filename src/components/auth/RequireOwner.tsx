import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Sparkles, LogOut } from 'lucide-react';

interface RequireOwnerProps {
    children: React.ReactNode;
}

export const RequireOwner: React.FC<RequireOwnerProps> = ({ children }) => {
    const { user, updateUserRole, logout } = useAuth();
    const [upgrading, setUpgrading] = useState(false);
    const navigate = useNavigate();

    const globalRole = user?.user_metadata?.role;

    if (upgrading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (globalRole === 'client') {
        const handleUpgrade = async () => {
            if (!confirm('¿Deseas convertir tu cuenta en Dueño? Esto te permitirá crear y administrar tu propia barbería.')) return;
            setUpgrading(true);
            try {
                await updateUserRole('owner');
                navigate('/create-business');
            } catch (err) {
                alert('Error al actualizar el rol.');
            } finally {
                setUpgrading(false);
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <Building2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tighter">Acceso Exclusivo</h2>
                    <p className="text-gray-500 mb-8 font-medium">
                        Este panel es exclusivo para dueños de barberías. ¿Deseas profesionalizar tu negocio y recibir reservas online?
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={handleUpgrade}
                            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Sparkles size={18} />
                            ¡Quiero ser Dueño!
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Volver al Inicio
                        </button>
                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 font-bold hover:text-red-500 transition py-2"
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
