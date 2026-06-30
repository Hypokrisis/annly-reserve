import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { XCircle, CheckCircle2, CalendarClock, ArrowRight } from 'lucide-react';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';

/**
 * Panel público de una cita, identificado SOLO por su cancel_token.
 * Sin login: el token es la verificación. Lo manda el bot en la confirmación.
 * Permite cancelar (cancel_appointment_by_token) o reagendar (link al booking).
 */
export default function MisCitasTokenPage() {
    const { token } = useParams<{ token: string }>();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) { setError('Link inválido.'); setLoading(false); return; }
        (async () => {
            try {
                const { data, error: err } = await supabase
                    .from('appointments')
                    .select('id, customer_name, appointment_date, start_time, status, services(name), barbers(name), businesses(name, slug)')
                    .eq('cancel_token', token)
                    .maybeSingle();
                if (err || !data) { setError('No encontramos una cita con este link.'); return; }
                setAppointment(data);
                if (data.status === 'cancelled') setCancelled(true);
            } catch {
                setError('Error cargando la cita.');
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    const handleCancel = async () => {
        if (!confirm('¿Seguro que quieres cancelar esta cita?')) return;
        setCancelling(true);
        try {
            const { data, error: err } = await supabase.rpc('cancel_appointment_by_token', { p_token: token });
            if (err) throw err;
            if (!data?.success) throw new Error(data?.error || 'token_invalid');
            setCancelled(true);
        } catch {
            setError('No se pudo cancelar. El link puede haber expirado o la cita ya fue cancelada.');
        } finally {
            setCancelling(false);
        }
    };

    // ¿La cita ya pasó? (fecha local + hora de inicio anteriores a ahora)
    const isPast = (() => {
        if (!appointment) return false;
        const [y, m, d] = appointment.appointment_date.split('-').map(Number);
        const [hh, mm] = appointment.start_time.split(':').map(Number);
        return new Date(y, m - 1, d, hh, mm).getTime() < Date.now();
    })();

    const business = appointment?.businesses as any;
    const serviceName = (appointment?.services as any)?.name;
    const barberName = (appointment?.barbers as any)?.name;

    const Shell = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 py-12">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-space-text">Spacey</span>
                    </Link>
                </div>
                {children}
                {/* CTA: crea cuenta para ver todas tus citas */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-space-muted mb-2">¿Quieres ver todas tus citas en un lugar?</p>
                    <Link to="/register-client" className="inline-flex items-center gap-1.5 text-sm font-bold text-space-primary hover:opacity-80 transition-opacity">
                        Crear cuenta gratis <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg"><LoadingSpinner /></div>
    );

    if (error) return (
        <Shell>
            <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border shadow-xl">
                <XCircle size={40} className="mx-auto text-space-danger mb-4" />
                <h2 className="text-lg font-extrabold text-space-text mb-2">Algo salió mal</h2>
                <p className="text-space-muted text-sm mb-6">{error}</p>
                <Link to="/" className="btn-secondary text-xs px-6 py-2.5">← Volver al inicio</Link>
            </div>
        </Shell>
    );

    if (cancelled) return (
        <Shell>
            <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border shadow-xl">
                <CheckCircle2 size={40} className="mx-auto text-space-success mb-4" />
                <h2 className="text-lg font-extrabold text-space-text mb-2">Esta cita fue cancelada</h2>
                <p className="text-space-muted text-sm mb-6">Ya no tienes esta cita reservada.</p>
                {business?.slug && (
                    <Link to={`/book/${business.slug}`} className="btn-primary text-xs px-6 py-2.5 inline-flex">Reservar de nuevo</Link>
                )}
            </div>
        </Shell>
    );

    if (isPast) return (
        <Shell>
            <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border shadow-xl">
                <CalendarClock size={40} className="mx-auto text-space-muted mb-4" />
                <h2 className="text-lg font-extrabold text-space-text mb-2">Esta cita ya ocurrió</h2>
                <p className="text-space-muted text-sm mb-6">
                    {serviceName} · {formatDate(parseDate(appointment.appointment_date))} a las {formatTimeDisplay(appointment.start_time)}
                </p>
                {business?.slug && (
                    <Link to={`/book/${business.slug}`} className="btn-primary text-xs px-6 py-2.5 inline-flex">Reservar otra cita</Link>
                )}
            </div>
        </Shell>
    );

    return (
        <Shell>
            <div className="bg-space-card rounded-2xl p-7 border border-space-border shadow-xl">
                <p className="text-sm text-space-muted mb-1">Hola{appointment.customer_name ? `, ${appointment.customer_name}` : ''} 👋</p>
                <h2 className="text-xl font-extrabold text-space-text mb-6">Tu cita</h2>

                <div className="space-y-3 mb-7 p-4 bg-space-bg rounded-xl border border-space-border/50">
                    <div className="text-sm text-space-text font-bold flex items-center gap-2">
                        <span>✂️</span>
                        <span>{serviceName}{barberName ? <span className="text-space-muted font-medium"> con {barberName}</span> : null}</span>
                    </div>
                    <div className="text-sm text-space-text font-bold flex items-center gap-2">
                        <span>📅</span>
                        <span>{formatDate(parseDate(appointment.appointment_date))} a las {formatTimeDisplay(appointment.start_time)}</span>
                    </div>
                    <div className="text-sm text-space-text font-bold flex items-center gap-2">
                        <span>🏪</span>
                        <span>{business?.name}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {business?.slug && (
                        <Link to={`/book/${business.slug}`} className="w-full btn-primary text-xs py-3 flex items-center justify-center gap-2">
                            <CalendarClock size={14} /> Reagendar
                        </Link>
                    )}
                    <button onClick={handleCancel} disabled={cancelling} className="w-full btn-danger text-xs py-3 disabled:opacity-50">
                        {cancelling ? 'Cancelando...' : 'Cancelar cita'}
                    </button>
                </div>
            </div>
        </Shell>
    );
}
