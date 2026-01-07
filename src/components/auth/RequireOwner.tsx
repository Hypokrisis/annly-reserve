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
            <div className="min-h-screen flex items-center justify-center bg-space-luxury">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-space-gold"></div>
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
            <div className="min-h-screen flex items-center justify-center bg-space-luxury p-4 relative overflow-hidden">
                {/* Luxury Background Effects */}
                <div className="absolute inset-0 z-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at center, #d4af37 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-space-gold/5 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="max-w-md w-full bg-space-card/80 backdrop-blur-md rounded-[2rem] shadow-2xl p-10 text-center border border-space-gold/20 relative z-10 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-space-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-space-gold/20">
                        <Building2 size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Acceso Exclusivo</h2>
                    <p className="text-space-muted mb-8 font-medium leading-relaxed">
                        Este panel es solo para dueños. ¿Quieres <span className="text-space-gold font-bold">profesionalizar</span> tu negocio y recibir reservas online?
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={handleUpgrade}
                            className="w-full bg-gradient-to-r from-space-gold to-yellow-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-space-gold/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Sparkles size={16} />
                            ¡Quiero ser Dueño!
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-space-card2 text-space-muted hover:text-white py-4 rounded-xl font-bold hover:bg-space-card border border-transparent hover:border-space-border transition-all text-xs uppercase tracking-widest"
                        >
                            Volver al Inicio
                        </button>
                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 text-xs text-space-danger/70 font-bold hover:text-space-danger transition py-2 uppercase tracking-wide opacity-80 hover:opacity-100"
                        >
                            <LogOut size={14} />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
