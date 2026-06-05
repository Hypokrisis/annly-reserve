import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CheckCircle2, XCircle, Calendar, Clock, Scissors } from 'lucide-react';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';

export default function CancelPage() {
    const { token } = useParams<{ token: string }>();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) { setError('Link inválido.'); setLoading(false); return; }
        loadAppointment();
    }, [token]);

    const loadAppointment = async () => {
        try {
            const { data, error: err } = await supabase
                .from('appointments')
                .select('id, customer_name, appointment_date, start_time, status, services(name), barbers(name), businesses(name)')
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
    };

    const handleCancel = async () => {
        if (!confirm('¿Estás seguro de que quieres cancelar esta cita?')) return;
        setCancelling(true);
        try {
            const { data, error: err } = await supabase
                .rpc('cancel_appointment_by_token', { p_token: token });
            if (err) throw err;
            if (!data?.success) throw new Error(data?.error || 'token_invalid');
            setCancelled(true);
        } catch {
            setError('No se pudo cancelar. El link puede haber expirado o la cita ya fue cancelada.');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <LoadingSpinner />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-space-text">Spacey</span>
                    </Link>
                </div>

                {error ? (
                    <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border shadow-xl">
                        <XCircle size={40} className="mx-auto text-space-danger mb-4" />
                        <h2 className="text-lg font-extrabold text-space-text mb-2">Link no válido</h2>
                        <p className="text-space-muted text-sm mb-6">{error}</p>
                        <Link to="/" className="btn-secondary text-xs px-6 py-2.5">← Volver al inicio</Link>
                    </div>
                ) : cancelled ? (
                    <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border shadow-xl">
                        <CheckCircle2 size={40} className="mx-auto text-space-success mb-4" />
                        <h2 className="text-lg font-extrabold text-space-text mb-2">Cita cancelada</h2>
                        <p className="text-space-muted text-sm mb-6">Tu cita fue cancelada exitosamente.</p>
                        <Link to="/" className="btn-primary text-xs px-6 py-2.5 inline-flex">Explorar barberías</Link>
                    </div>
                ) : appointment ? (
                    <div className="bg-space-card rounded-2xl p-8 border border-space-border shadow-xl">
                        <h2 className="text-xl font-extrabold text-space-text mb-1">Detalles de tu cita</h2>
                        <p className="text-space-muted text-sm mb-6">{(appointment.businesses as any)?.name}</p>

                        <div className="space-y-3 mb-7 p-4 bg-space-bg rounded-xl border border-space-border/50">
                            <div className="flex items-center gap-3 text-sm">
                                <Scissors size={14} className="text-space-primary flex-shrink-0" />
                                <span className="text-space-text font-bold">{(appointment.services as any)?.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar size={14} className="text-space-primary flex-shrink-0" />
                                <span className="text-space-muted">{formatDate(parseDate(appointment.appointment_date))}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Clock size={14} className="text-space-primary flex-shrink-0" />
                                <span className="text-space-muted">{formatTimeDisplay(appointment.start_time)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-space-muted mb-5 text-center">
                            Hola, <strong>{appointment.customer_name}</strong>. ¿Deseas cancelar esta cita?
                        </p>

                        <div className="flex gap-3">
                            <Link to="/" className="flex-1 btn-secondary text-xs py-2.5 text-center">No cancelar</Link>
                            <button onClick={handleCancel} disabled={cancelling}
                                className="flex-1 btn-danger text-xs py-2.5 disabled:opacity-50">
                                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
