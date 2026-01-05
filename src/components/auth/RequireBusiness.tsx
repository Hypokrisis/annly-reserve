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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                        <Scissors size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tighter">Bienvenido</h2>
                    <p className="text-gray-500 mb-8 font-medium">
                        Aún no has configurado tu barbería. Solo te toma 1 minuto empezar.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/create-business')}
                            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Building2 size={18} />
                            Crear Mi Barbería
                            <ArrowRight size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
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
