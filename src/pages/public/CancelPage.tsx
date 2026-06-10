import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CheckCircle2, XCircle, Calendar, Clock, Scissors, CalendarClock } from 'lucide-react';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';
import { calculateAvailability, type AvailableSlot } from '@/services/availability.service';

export default function CancelPage() {
    const { token } = useParams<{ token: string }>();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [error, setError] = useState('');

    // Reschedule flow
    const [mode, setMode] = useState<'view' | 'reschedule'>('view');
    const [newDate, setNewDate] = useState('');
    const [slots, setSlots] = useState<AvailableSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [newTime, setNewTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [rescheduled, setRescheduled] = useState(false);

    useEffect(() => {
        if (!token) { setError('Link inválido.'); setLoading(false); return; }
        loadAppointment();
    }, [token]);

    const loadAppointment = async () => {
        try {
            const { data, error: err } = await supabase
                .from('appointments')
                .select('id, customer_name, appointment_date, start_time, status, business_id, barber_id, service_id, services(name), barbers(name), businesses(name)')
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

    // Load availability for the same barber + service when a date is chosen
    useEffect(() => {
        if (mode !== 'reschedule' || !newDate || !appointment) return;
        let active = true;
        setLoadingSlots(true);
        setNewTime('');
        calculateAvailability({
            businessId: appointment.business_id,
            serviceId: appointment.service_id,
            barberId: appointment.barber_id,
            date: newDate,
        })
            .then(s => { if (active) setSlots(s); })
            .catch(() => { if (active) setSlots([]); })
            .finally(() => { if (active) setLoadingSlots(false); });
        return () => { active = false; };
    }, [mode, newDate, appointment]);

    const handleReschedule = async () => {
        if (!newDate || !newTime) return;
        setSaving(true);
        try {
            const { data, error: err } = await supabase
                .rpc('reschedule_appointment_by_token', { p_token: token, p_date: newDate, p_time: newTime });
            if (err) throw err;
            if (!data?.success) throw new Error(data?.error || 'reschedule_failed');
            setRescheduled(true);
        } catch (e: any) {
            const reason = e?.message === 'slot_taken'
                ? 'Ese horario acaba de ocuparse. Elige otro.'
                : 'No se pudo reagendar. El link puede haber expirado.';
            setError(reason);
        } finally {
            setSaving(false);
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
                        <h2 className="text-lg font-extrabold text-space-text mb-2">Algo salió mal</h2>
                        <p className="text-space-muted text-sm mb-6">{error}</p>
                        <Link to="/" className="btn-secondary text-xs px-6 py-2.5">← Volver al inicio</Link>
                    </div>
                ) : rescheduled ? (
                    <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border shadow-xl">
                        <CheckCircle2 size={40} className="mx-auto text-space-success mb-4" />
                        <h2 className="text-lg font-extrabold text-space-text mb-2">¡Cita reagendada!</h2>
                        <p className="text-space-muted text-sm mb-6">
                            Tu nueva cita es el <strong className="text-space-text">{formatDate(parseDate(newDate))}</strong> a las <strong className="text-space-text">{formatTimeDisplay(newTime)}</strong>. Te enviamos la confirmación por WhatsApp.
                        </p>
                        <Link to="/" className="btn-primary text-xs px-6 py-2.5 inline-flex">Listo</Link>
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

                        {mode === 'view' ? (
                            <>
                                <p className="text-xs text-space-muted mb-5 text-center">
                                    Hola, <strong>{appointment.customer_name}</strong>. ¿Qué deseas hacer con tu cita?
                                </p>
                                <div className="space-y-3">
                                    <button onClick={() => { setMode('reschedule'); setNewDate(''); setNewTime(''); setSlots([]); }}
                                        className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2">
                                        <CalendarClock size={14} /> Reagendar
                                    </button>
                                    <div className="flex gap-3">
                                        <Link to="/" className="flex-1 btn-secondary text-xs py-2.5 text-center">Mantener cita</Link>
                                        <button onClick={handleCancel} disabled={cancelling}
                                            className="flex-1 btn-danger text-xs py-2.5 disabled:opacity-50">
                                            {cancelling ? 'Cancelando...' : 'Cancelar'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-space-text">Elige nuevo horario</p>
                                    <button onClick={() => setMode('view')} className="text-xs text-space-muted hover:text-space-text transition">← Volver</button>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-space-muted">Nueva fecha</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="input-field mt-1"
                                    />
                                </div>

                                {newDate && (
                                    loadingSlots ? (
                                        <div className="py-4 flex justify-center"><LoadingSpinner /></div>
                                    ) : slots.length === 0 ? (
                                        <p className="text-sm text-space-muted py-3 text-center bg-space-bg rounded-xl border border-space-border">
                                            No hay horarios disponibles ese día.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto">
                                            {slots.map(slot => (
                                                <button
                                                    key={slot.time}
                                                    type="button"
                                                    onClick={() => setNewTime(slot.time)}
                                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                                        newTime === slot.time
                                                            ? 'bg-space-primary text-white border-space-primary'
                                                            : 'bg-white text-space-text border-space-border hover:border-space-primary/40'
                                                    }`}
                                                >
                                                    {formatTimeDisplay(slot.time)}
                                                </button>
                                            ))}
                                        </div>
                                    )
                                )}

                                <button
                                    onClick={handleReschedule}
                                    disabled={saving || !newDate || !newTime}
                                    className="btn-primary w-full text-xs py-2.5 disabled:opacity-50"
                                >
                                    {saving ? 'Reagendando...' : 'Confirmar nuevo horario'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
