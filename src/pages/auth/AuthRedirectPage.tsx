import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * After login, waits for auth bootstrap and routes by DB role:
 *   owner / admin + business   → /dashboard
 *   owner / admin + no biz     → /create-business
 *   barber                     → /staff
 *   member / null              → / (homepage — can browse directory)
 *
 * Also handles new signups where user_metadata.role === 'owner'
 * but users_businesses is still empty (no business created yet).
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

        // Business owner or admin
        if (role === 'owner' || role === 'admin') {
            navigate(currentBusiness ? '/dashboard' : '/create-business', { replace: true });
            return;
        }

        // Staff / barber
        if (role === 'barber') {
            navigate('/staff', { replace: true });
            return;
        }

        // No role in users_businesses — check if they signed up as owner
        const metaRole = (user as any).user_metadata?.role;
        if (metaRole === 'owner') {
            navigate('/create-business', { replace: true });
            return;
        }

        // Everyone else (member, client, guest signup) → homepage with directory
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
