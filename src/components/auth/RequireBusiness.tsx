import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Scissors, ArrowRight } from 'lucide-react';

interface RequireBusinessProps {
    children: React.ReactNode;
}

export const RequireBusiness: React.FC<RequireBusinessProps> = ({ children }) => {
    const { businesses } = useAuth();
    const navigate = useNavigate();

    if (businesses.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-space-luxury p-4 relative overflow-hidden">
                {/* Luxury Background Effects */}
                <div className="absolute inset-0 z-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at center, #d4af37 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-space-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-md w-full bg-space-card/80 backdrop-blur-md rounded-[2rem] shadow-2xl p-10 text-center border border-space-gold/20 relative z-10 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-space-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-space-gold/20 animate-float">
                        <Scissors size={32} />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Bienvenido</h2>
                    <p className="text-space-muted mb-8 font-medium">
                        Aún no has configurado tu barbería. Solo te toma <span className="text-space-gold font-bold">1 minuto</span> empezar.
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/create-business')}
                            className="w-full bg-gradient-to-r from-space-gold to-yellow-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-space-gold/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Building2 size={16} />
                            Crear Mi Barbería
                            <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-space-card2 text-space-muted hover:text-white py-4 rounded-xl font-bold hover:bg-space-card border border-transparent hover:border-space-border transition-all text-xs uppercase tracking-widest"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
