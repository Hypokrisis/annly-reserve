import { useAuth } from '@/contexts/AuthContext';
import { Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StaffHome() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-space-bg px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-space-primary/10 flex items-center justify-center">
                <Scissors size={28} className="text-space-primary" />
            </div>
            <div>
                <h1 className="text-2xl font-extrabold text-space-text mb-2">Panel de Staff</h1>
                <p className="text-space-muted text-sm max-w-xs">
                    Hola, <strong>{user?.email}</strong>. Tu panel de staff está en construcción — llegará en la Fase 4.
                </p>
            </div>
            <Link to="/" className="btn-secondary text-xs px-6 py-2.5">← Volver al inicio</Link>
        </div>
    );
}
