import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientHome() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-space-bg px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-space-primary/10 flex items-center justify-center">
                <Calendar size={28} className="text-space-primary" />
            </div>
            <div>
                <h1 className="text-2xl font-extrabold text-space-text mb-2">Mi Área de Cliente</h1>
                <p className="text-space-muted text-sm max-w-xs">
                    Hola, <strong>{user?.email}</strong>. Tu panel de cliente está en construcción — llegará en la Fase 5.
                </p>
            </div>
            <Link to="/" className="btn-secondary text-xs px-6 py-2.5">← Explorar barberías</Link>
        </div>
    );
}
