import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * Landing page after login/signup.
 * Waits for auth bootstrap to finish, then redirects based on DB role:
 *   owner / admin → /dashboard
 *   barber        → /staff
 *   member / null → /client
 */
export default function AuthRedirectPage() {
    const { user, role, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            navigate('/login', { replace: true });
            return;
        }

        if (role === 'owner' || role === 'admin') {
            navigate('/dashboard', { replace: true });
        } else if (role === 'barber') {
            navigate('/staff', { replace: true });
        } else {
            navigate('/client', { replace: true });
        }
    }, [loading, user, role]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-space-bg">
            <LoadingSpinner />
            <p className="text-xs font-extrabold uppercase tracking-widest text-space-muted animate-pulse">
                Cargando tu cuenta...
            </p>
        </div>
    );
}
