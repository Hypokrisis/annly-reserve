import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { User, MessageSquare, Calendar, History, Search, Filter, Send, CheckCircle2, XCircle, Loader2, Bell, CheckSquare, Square } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Client {
    email: string;
    name: string;
    phone: string;
    last_visit: string;
    total_appointments: number;
}

type ReminderResult = {
    business: string;
    sent?: number;
    inactiveClients?: number;
    reason?: string;
    errors?: string[];
};

export default function ClientsPage() {
    const { business } = useBusiness();
    const { } = useAuth();
    const toast = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [inactiveDays, setInactiveDays] = useState(14);
    const [sending, setSending] = useState(false);
    const [reminderResult, setReminderResult] = useState<{ ok: boolean; results: ReminderResult[] } | null>(null);
    const [customMessage, setCustomMessage] = useState('Hoy tenemos una promoción especial de 2x1 en recortes.');

    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (business?.id) {
            loadClients();
            if ((business as any).reminder_inactive_days) {
                setInactiveDays((business as any).reminder_inactive_days);
            }
        }
    }, [business?.id]);

    const loadClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('customer_email, customer_name, customer_phone, appointment_date, status')
                .eq('business_id', business?.id)
                .order('appointment_date', { ascending: false });

            if (error) throw error;

            const clientMap = new Map<string, Client>();
            data.forEach(apt => {
                if (!clientMap.has(apt.customer_email)) {
                    clientMap.set(apt.customer_email, {
                        email: apt.customer_email,
                        name: apt.customer_name,
                        phone: apt.customer_phone,
                        last_visit: apt.appointment_date,
                        total_appointments: 1
                    });
                } else {
                    const existing = clientMap.get(apt.customer_email)!;
                    existing.total_appointments += 1;
                }
            });

            setClients(Array.from(clientMap.values()));
        } catch (err) {
            console.error('Error loading clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = async (client: Client) => {
        if (!business || !client.phone) {
            toast.error('Este cliente no tiene número de teléfono registrado.');
            return;
        }
        try {
            const messageTemplate = (business as any).whatsapp_reminder_template ||
                "¡Hola {{customer_name}}! Te escribimos de {{business_name}} 💈. Ya llevas un tiempo sin visitarnos. Reserva tu próxima cita aquí: {{booking_link}}";

            const bookingLink = (business as any).whatsapp_booking_link || `${window.location.origin}/book/${business.slug}`;
            const offer = (business as any).whatsapp_offer || "";

            const formattedMessage = messageTemplate
                .replace(/{{customer_name}}/g, client.name)
                .replace(/{{business_name}}/g, business.name)
                .replace(/{{booking_link}}/g, bookingLink)
                .replace(/{{offer}}/g, offer);

            let cleanPhone = client.phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length === 10) cleanPhone = '1' + cleanPhone;

            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMessage)}`;
            window.open(waUrl, '_blank');
            toast.success(`Redireccionando a WhatsApp para enviar recordatorio a ${client.name}...`);
        } catch (e: any) {
            toast.error('Error al generar recordatorio: ' + e.message);
        }
    };

    const handleBulkReminders = async () => {
        if (selectedEmails.size === 0 && inactiveCount === 0) {
            toast.warning('No hay clientes para enviar. Ajusta los días o selecciona clientes manualmente.');
            return;
        }

        setSending(true);
        setReminderResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            let payload: any = {
                inactiveDays,
                businessId: business?.id,
                customMessage: customMessage.trim() || 'Esperamos verte pronto.'
            };

            if (selectedEmails.size > 0) {
                const customClients = clients
                    .filter(c => selectedEmails.has(c.email))
                    .map(c => ({ phone: c.phone, name: c.name, lastDate: c.last_visit }));
                payload.customClients = customClients;
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-reminders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Error al enviar recordatorios');

            setReminderResult({ ok: true, results: json.results || [] });

            const totalSent = (json.results || []).reduce((acc: number, r: any) => acc + (r.sent ?? 0), 0);
            if (totalSent > 0) {
                toast.success(`¡${totalSent} mensaje(s) enviados con éxito!`);
                setSelectedEmails(new Set());
            } else {
                const reason = json.results?.[0]?.reason;
                toast.warning(reason || 'No se enviaron mensajes. Verifica la configuración.');
            }

        } catch (err: any) {
            setReminderResult({ ok: false, results: [{ business: 'Error', reason: err.message }] });
            toast.error('Error: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const saveDaysSetting = async () => {
        if (!business?.id) return;
        await supabase
            .from('businesses')
            .update({ reminder_inactive_days: inactiveDays })
            .eq('id', business.id);
    };

    const toggleSelection = (email: string) => {
        const newSet = new Set(selectedEmails);
        if (newSet.has(email)) newSet.delete(email);
        else newSet.add(email);
        setSelectedEmails(newSet);
    };

    const toggleAll = () => {
        if (selectedEmails.size === filteredClients.length) {
            setSelectedEmails(new Set());
        } else {
            setSelectedEmails(new Set(filteredClients.map(c => c.email)));
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const getClientStatus = (lastVisit: string) => {
        const lastVisitDate = new Date(lastVisit);
        const diffDays = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 21) return { label: 'En Riesgo', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#ef4444', days: diffDays };
        if (diffDays > 14) return { label: 'Toca Recorte', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#f59e0b', days: diffDays };
        return { label: 'Reciente', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', color: '#22c55e', days: diffDays };
    };

    const inactiveCount = clients.filter(c => {
        const diff = Math.floor((Date.now() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24));
        return diff >= inactiveDays;
    }).length;

    const sendButtonLabel = sending
        ? 'Enviando...'
        : selectedEmails.size > 0
            ? `Enviar a ${selectedEmails.size} Seleccionados`
            : `Enviar a ${inactiveCount} Inactivos`;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-[#f0f4ee]">Clientes</h1>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#95ab8a]">
                            <User size={12} className="text-[#9bc287]" /> {clients.length} clientes registrados
                        </p>
                    </div>
                </div>

                {/* Reminder Control Panel */}
                <div className="rounded-[20px] border border-[#9bc287]/20 p-6 relative overflow-hidden" style={{ background: '#131c17' }}>
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'rgba(155,194,135,0.04)' }} />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(155,194,135,0.1)' }}>
                                    <Bell size={20} style={{ color: '#9bc287' }} />
                                </div>
                                <div>
                                    <h2 className="font-black uppercase tracking-tight text-sm text-[#f0f4ee]">Campañas & Recordatorios</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#95ab8a]">
                                        Automatiza por días o selecciona clientes manualmente
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                            <div className={`lg:col-span-2 transition-opacity ${selectedEmails.size > 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#95ab8a]">
                                        Modo Automático: Inactividad
                                    </label>
                                    <span className="text-lg font-black text-[#9bc287]">{inactiveDays} días</span>
                                </div>
                                <input
                                    type="range" min={7} max={60} step={1}
                                    value={inactiveDays}
                                    onChange={e => setInactiveDays(Number(e.target.value))}
                                    onMouseUp={saveDaysSetting}
                                    onTouchEnd={saveDaysSetting}
                                    className="w-full h-2 rounded-full cursor-pointer accent-[#9bc287]"
                                />
                                <div className="flex justify-between text-[9px] font-bold mt-1 text-[#95ab8a]">
                                    <span>7 días</span><span>30 días</span><span>60 días</span>
                                </div>
                                <p className="text-[10px] font-bold mt-3 uppercase tracking-widest">
                                    {inactiveCount > 0
                                        ? <span style={{ color: '#f59e0b' }}>⚠ {inactiveCount} cliente(s) inactivo(s).</span>
                                        : <span style={{ color: '#22c55e' }}>✓ Todos han visitado recientemente.</span>
                                    }
                                </p>
                            </div>

                            <div className="lg:col-span-3 mt-2 mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-[#f0f4ee]">
                                    Mensaje de la Oferta <span className="text-[#9bc287]">*</span>
                                </label>
                                <textarea
                                    className="w-full rounded-xl p-3 text-sm font-medium focus:outline-none resize-none h-20 placeholder-[#95ab8a]/40 border transition-all focus:border-[#9bc287]"
                                    style={{ background: '#090d0b', border: '1px solid #243529', color: '#f0f4ee' }}
                                    placeholder="Ej. Hoy tenemos 2x1 en recortes..."
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                />
                                <p className="text-[9px] font-bold mt-1 uppercase tracking-widest text-[#95ab8a]">
                                    Se insertará en el mensaje: "Queremos comentarte lo siguiente: [TU MENSAJE AQUÍ]."
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 lg:col-span-3">
                                {selectedEmails.size > 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center text-[#9bc287]">
                                        Modo Manual Activo
                                    </p>
                                )}
                                <button
                                    onClick={handleBulkReminders}
                                    disabled={sending || (selectedEmails.size === 0 && inactiveCount === 0)}
                                    className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: selectedEmails.size > 0 ? '#f0f4ee' : '#9bc287',
                                        color: '#22321c',
                                    }}
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    {sendButtonLabel}
                                </button>
                            </div>
                        </div>

                        {reminderResult && (
                            <div className="mt-4 p-4 rounded-2xl text-sm font-bold flex items-start gap-3"
                                style={reminderResult.ok
                                    ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }
                                    : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }
                                }>
                                {reminderResult.ok
                                    ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                                    : <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                                }
                                <div>
                                    {reminderResult.results.map((r, i) => (
                                        <div key={i} className="mb-2 last:mb-0">
                                            <p>{reminderResult.ok
                                                ? `✓ ${r.sent ?? 0} mensajes enviados con éxito a ${r.business}.${r.reason ? ` (${r.reason})` : ''}`
                                                : `✗ ${r.reason || 'Error crítico al enviar.'}`
                                            }</p>
                                            {r.errors && r.errors.length > 0 && (
                                                <div className="mt-1 text-[10px] rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
                                                    <strong>Errores de Twilio:</strong>
                                                    <ul className="list-disc pl-4 mt-1">
                                                        {r.errors.map((errText: string, idx: number) => (
                                                            <li key={idx}>{errText}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter and Select All Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-3 flex-1 rounded-[20px] px-4 border" style={{ background: '#131c17', borderColor: '#243529' }}>
                        <Search style={{ color: '#95ab8a' }} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="flex-1 bg-transparent border-none outline-none text-sm font-bold h-12 placeholder-[#95ab8a]/50"
                            style={{ color: '#f0f4ee' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase"
                            style={{ background: '#1d2a23', color: '#95ab8a' }}>
                            <Filter size={10} /> {filteredClients.length}
                        </div>
                    </div>

                    {filteredClients.length > 0 && (
                        <button
                            onClick={toggleAll}
                            className="px-5 h-12 rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border"
                            style={selectedEmails.size === filteredClients.length
                                ? { background: 'rgba(155,194,135,0.1)', borderColor: '#9bc287', color: '#9bc287' }
                                : { background: '#131c17', borderColor: '#243529', color: '#95ab8a' }
                            }
                        >
                            {selectedEmails.size === filteredClients.length ? <CheckSquare size={16} /> : <Square size={16} />}
                            {selectedEmails.size === filteredClients.length ? 'Deseleccionar' : 'Sel. Todos'}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : filteredClients.length === 0 ? (
                    <div className="rounded-[20px] p-20 text-center" style={{ background: '#131c17', border: '1px dashed #243529' }}>
                        <User size={48} className="mx-auto mb-4" style={{ color: '#243529' }} />
                        <h3 className="text-xl font-black uppercase tracking-tight text-[#f0f4ee]">No hay clientes aún</h3>
                        <p className="text-sm font-bold mt-2 uppercase tracking-widest text-[#95ab8a]">Las personas que reserven aparecerán aquí automáticamente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredClients.map((client) => {
                            const status = getClientStatus(client.last_visit);
                            const isSelected = selectedEmails.has(client.email);

                            return (
                                <div key={client.email}
                                    onClick={() => toggleSelection(client.email)}
                                    className="rounded-[20px] p-5 transition-all cursor-pointer"
                                    style={{
                                        background: isSelected ? 'rgba(155,194,135,0.05)' : '#131c17',
                                        border: `1px solid ${isSelected ? 'rgba(155,194,135,0.4)' : '#243529'}`,
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(155,194,135,0.25)'; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#243529'; }}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                        <div className="flex items-center gap-4">
                                            <div className="pointer-events-auto flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelection(client.email); }}>
                                                {isSelected
                                                    ? <CheckSquare size={22} style={{ color: '#9bc287' }} />
                                                    : <Square size={22} style={{ color: '#243529' }} />
                                                }
                                            </div>

                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)', color: '#22321c' }}>
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2.5 mb-1">
                                                    <h3 className="text-sm font-black uppercase tracking-tight text-[#f0f4ee]">{client.name}</h3>
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                                                        style={{ background: status.bg, borderColor: status.border, color: status.color }}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    <p className="text-xs font-bold flex items-center gap-1.5 text-[#95ab8a]">
                                                        <MessageSquare size={11} style={{ color: '#9bc287' }} /> {client.phone}
                                                    </p>
                                                    <p className="text-xs font-bold flex items-center gap-1.5 text-[#95ab8a]">
                                                        <History size={11} style={{ color: '#9bc287' }} /> {client.total_appointments} Visitas
                                                    </p>
                                                    <p className="text-xs font-bold text-[#95ab8a]">hace {status.days} días</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0" style={{ borderColor: '#243529' }}>
                                            <div className="text-right flex-1 lg:flex-initial pr-4">
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[#95ab8a]">Última Visita</p>
                                                <p className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-[#f0f4ee]">
                                                    <Calendar size={13} style={{ color: '#9bc287' }} />
                                                    {format(new Date(client.last_visit), "d 'de' MMMM", { locale: es })}
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSendReminder(client); }}
                                                className="w-full sm:w-auto px-5 h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 pointer-events-auto"
                                                style={{ background: '#1d2a23', color: '#f0f4ee', border: '1px solid #243529' }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(155,194,135,0.4)'; e.currentTarget.style.color = '#9bc287'; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#243529'; e.currentTarget.style.color = '#f0f4ee'; }}
                                            >
                                                <MessageSquare size={14} /> WA Manual
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
