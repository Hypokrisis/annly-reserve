import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { CheckCircle2, XCircle, Loader2, Scissors } from 'lucide-react';

export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando tu cuenta...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase puts the access_token in the URL hash after confirmation
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data.session) {
                    // Already logged in via the token in URL
                    setStatus('success');
                    setMessage('¡Email confirmado! Iniciando sesión...');
                    setTimeout(() => navigate('/dashboard'), 2000);
                } else {
                    // Try exchanging the code from URL params (PKCE flow)
                    const params = new URLSearchParams(window.location.search);
                    const code = params.get('code');

                    if (code) {
                        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                        if (exchangeError) throw exchangeError;
                        setStatus('success');
                        setMessage('¡Email confirmado! Iniciando sesión...');
                        setTimeout(() => navigate('/dashboard'), 2000);
                    } else {
                        // Check hash for token (implicit flow)
                        const hash = window.location.hash;
                        if (hash && hash.includes('access_token')) {
                            const { data: refreshed } = await supabase.auth.getSession();
                            if (refreshed.session) {
                                setStatus('success');
                                setMessage('¡Email confirmado! Iniciando sesión...');
                                setTimeout(() => navigate('/dashboard'), 2000);
                                return;
                            }
                        }
                        throw new Error('No se encontró un token de confirmación válido.');
                    }
                }
            } catch (err: any) {
                console.error('Auth callback error:', err);
                setStatus('error');
                setMessage(err.message || 'Error al confirmar el email.');
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-space-bg flex items-center justify-center px-4">
            <div className="card p-10 max-w-md w-full text-center bg-white border-2 border-space-border/50 shadow-xl rounded-3xl">
                {/* Logo */}
                <div className="w-16 h-16 bg-space-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Scissors size={32} className="text-white" />
                </div>

                <h1 className="text-2xl font-black text-space-text uppercase tracking-tight mb-2">Spacey</h1>
                <p className="text-[10px] text-space-muted font-black uppercase tracking-[0.3em] mb-8">Confirmación de Cuenta</p>

                <div className="flex flex-col items-center gap-4">
                    {status === 'loading' && (
                        <>
                            <Loader2 size={48} className="text-space-primary animate-spin" />
                            <p className="font-bold text-space-text">{message}</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <CheckCircle2 size={48} className="text-emerald-500" />
                            <p className="font-bold text-emerald-700">{message}</p>
                            <p className="text-xs text-space-muted font-bold mt-2">Serás redirigido automáticamente...</p>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <XCircle size={48} className="text-red-500" />
                            <p className="font-bold text-red-700">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="mt-4 px-6 py-3 bg-space-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-space-primary/90 transition-all"
                            >
                                Ir al Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
