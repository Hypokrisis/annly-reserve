import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * After login, waits for auth bootstrap (loading stays true until user/role/
 * currentBusiness are populated) and routes by real state:
 *   owner / admin + business   → /dashboard
 *   owner / admin + no biz     → /create-business
 *   barber                     → /staff
 *   sin membresía + meta owner → /create-business  (owner recién registrado)
 *   sin membresía (cliente)    → /client
 *   cualquier otro             → / (fallback seguro)
 *
 * user_metadata.role SOLO se consulta como desempate de cola, cuando la
 * membresía (role) es null y `loading` ya terminó (estado real). Un owner CON
 * negocio entra por la rama de arriba y nunca lo toca, así que esto NO
 * reintroduce la carrera que arregló el fix de loading en login().
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

        // Sin membresía de negocio: owner-sin-negocio y cliente se ven igual
        // (role=null). Desempate de cola por user_metadata.role — seguro aquí
        // porque loading ya terminó y el owner CON negocio nunca llega a esta rama.
        if (!role) {
            const metaRole = (user as any).user_metadata?.role;
            navigate(metaRole === 'owner' ? '/create-business' : '/client', { replace: true });
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
