import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * After login, waits for auth bootstrap (loading stays true until user/role/
 * currentBusiness are populated) and routes ONLY by real state:
 *   owner / admin + business   → /dashboard
 *   owner / admin + no biz     → /create-business
 *   barber                     → /staff
 *   client (sesión sin negocio)→ /client
 *   cualquier otro             → / (fallback seguro)
 *
 * No consulta user_metadata.role: ese atajo mandaba owners CON negocio a
 * /create-business durante la carrera de carga. Al esperar a `loading` el
 * estado ya es real, así que basta el rol de la membresía.
 */
export default function AuthRedirectPage() {
    const { user, role, loading, currentBusiness } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            navigate('/login', { replace: true });
            return;
        }

        // Owner / admin
        if (role === 'owner' || role === 'admin') {
            navigate(currentBusiness ? '/dashboard' : '/create-business', { replace: true });
            return;
        }

        // Staff / barber
        if (role === 'barber') {
            navigate('/staff', { replace: true });
            return;
        }

        // Sesión válida sin membresía de negocio = cliente con cuenta
        if (!role) {
            navigate('/client', { replace: true });
            return;
        }

        // Rol inesperado → fallback seguro al landing
        navigate('/', { replace: true });
    }, [loading, user, role, currentBusiness]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-space-bg">
            <LoadingSpinner />
            <p className="text-xs font-extrabold uppercase tracking-widest text-space-muted animate-pulse">
                Cargando tu cuenta...
            </p>
        </div>
    );
}
