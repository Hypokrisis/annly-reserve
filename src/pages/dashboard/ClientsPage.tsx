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
    const { user } = useAuth();
    const toast = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [inactiveDays, setInactiveDays] = useState(14);
    const [sending, setSending] = useState(false);
    const [reminderResult, setReminderResult] = useState<{ ok: boolean; results: ReminderResult[] } | null>(null);
    const [customMessage, setCustomMessage] = useState('Hoy tenemos una promoción especial de 2x1 en recortes.');

    // Manual selection
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

    // Individual manual send — queues via notification_jobs
    // so the same Twilio worker handles it (with template support)
    const handleSendReminder = async (client: Client) => {
        if (!business || !client.phone) {
            toast.error('Este cliente no tiene número de teléfono registrado.');
            return;
        }
        try {
            // Find the most recent appointment for this client
            const { data: apt, error } = await supabase
                .from('appointments')
                .select('id, business_id')
                .eq('business_id', business.id)
                .eq('customer_phone', client.phone)
                .order('appointment_date', { ascending: false })
                .limit(1)
                .single();

            if (error || !apt) {
                toast.error('No se encontró una cita asociada a este cliente para enviar el recordatorio.');
                return;
            }

            const { error: rpcError } = await supabase.rpc('force_send_reminder', {
                p_appointment_id: apt.id
            });

            if (rpcError) throw rpcError;
            toast.success(`¡Recordatorio enviado a ${client.name}! Llegará en unos instantes.`);
        } catch (e: any) {
            toast.error('Error al enviar recordatorio: ' + e.message);
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
        if (diffDays > 21) return { label: 'En Riesgo', color: 'bg-red-100 text-red-700 border-red-200', days: diffDays };
        if (diffDays > 14) return { label: 'Toca Recorte', color: 'bg-amber-100 text-amber-700 border-amber-200', days: diffDays };
        return { label: 'Reciente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', days: diffDays };
    };

    const inactiveCount = clients.filter(c => {
        const diff = Math.floor((Date.now() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24));
        return diff >= inactiveDays;
    }).length;

    // Send button label logic
    const sendButtonLabel = sending 
        ? 'Enviando...' 
        : selectedEmails.size > 0 
            ? `Enviar a ${selectedEmails.size} Seleccionados`
            : `Enviar a ${inactiveCount} Inactivos`;

    return (
        <DashboardLayout>
            <div className="animate-fade-up">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-space-text tracking-tight uppercase italic">Mis Clientes</h1>
                        <p className="text-space-muted font-bold tracking-widest uppercase text-[10px] mt-1 flex items-center gap-2">
                             <User size={12} className="text-space-primary" /> {clients.length} clientes registrados
                        </p>
                    </div>
                </div>

                {/* ── Reminder Control Panel ─────────────────────────── */}
                <div className="card p-6 mb-8 bg-white border-2 border-space-primary/20 overflow-hidden relative">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-space-primary/5 rounded-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-space-primary/10 rounded-xl flex items-center justify-center">
                                    <Bell size={20} className="text-space-primary" />
                                </div>
                                <div>
                                    <h2 className="font-black text-space-text uppercase tracking-tight text-sm">Campañas & Recordatorios</h2>
                                    <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">
                                        Automatiza por días o selecciona clientes manualmente
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                            {/* Days Config - Disabled visually if manual selection is active */}
                            <div className={`lg:col-span-2 transition-opacity ${selectedEmails.size > 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-space-muted uppercase tracking-widest">
                                        Modo Automático: Inactividad
                                    </label>
                                    <span className="text-lg font-black text-space-primary">{inactiveDays} días</span>
                                </div>
                                <input
                                    type="range"
                                    min={7} max={60} step={1}
                                    value={inactiveDays}
                                    onChange={e => setInactiveDays(Number(e.target.value))}
                                    onMouseUp={saveDaysSetting}
                                    onTouchEnd={saveDaysSetting}
                                    className="w-full h-2 rounded-full accent-space-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-space-muted font-bold mt-1">
                                    <span>7 días</span><span>30 días</span><span>60 días</span>
                                </div>
                                <p className="text-[10px] text-space-muted font-bold mt-3 uppercase tracking-widest">
                                    {inactiveCount > 0
                                        ? <span className="text-amber-600">⚠️ {inactiveCount} cliente(s) inactivo(s).</span>
                                        : <span className="text-emerald-600">✅ Todos han visitado recientemente.</span>
                                    }
                                </p>
                            </div>

                            {/* Custom Message Field */}
                            <div className="lg:col-span-3 mt-2 mb-2">
                                <label className="text-[10px] font-black text-space-text uppercase tracking-widest mb-2 block">
                                    Mensaje de la Oferta <span className="text-space-primary">*</span>
                                </label>
                                <textarea
                                    className="w-full bg-space-bg border border-space-border/50 rounded-xl p-3 text-sm font-medium text-space-text focus:outline-none focus:border-space-primary resize-none h-20 placeholder-space-muted"
                                    placeholder="Ej. Hoy tenemos 2x1 en recortes..."
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                />
                                <p className="text-[9px] text-space-muted font-bold mt-1 uppercase tracking-widest">
                                    Se insertará en el mensaje: "Queremos comentarte lo siguiente: [TU MENSAJE AQUÍ]."
                                </p>
                            </div>

                            {/* Send Button */}
                            <div className="flex flex-col gap-2 lg:col-span-3">
                                {selectedEmails.size > 0 && (
                                    <p className="text-[10px] text-space-primary font-black uppercase tracking-widest text-center">
                                        Modo Manual Activo
                                    </p>
                                )}
                                <button
                                    onClick={handleBulkReminders}
                                    disabled={sending || (selectedEmails.size === 0 && inactiveCount === 0)}
                                    className={`w-full h-14 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3 ${
                                        selectedEmails.size > 0 ? 'bg-space-text hover:bg-space-text/90 shadow-space-text/20' : 'bg-space-primary hover:bg-space-primary/90 shadow-space-primary/20'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    {sendButtonLabel}
                                </button>
                            </div>
                        </div>

                        {/* Result Feedback */}
                        {reminderResult && (
                            <div className={`mt-4 p-4 rounded-2xl border text-sm font-bold flex items-start gap-3 ${reminderResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                {reminderResult.ok
                                    ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                    : <XCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                }
                                <div>
                                    {reminderResult.results.map((r, i) => (
                                        <div key={i} className="mb-2 last:mb-0">
                                            <p>{reminderResult.ok
                                                ? `✅ ${r.sent ?? 0} mensajes enviados con éxito a ${r.business}.${r.reason ? ` (${r.reason})` : ''}`
                                                : `❌ ${r.reason || 'Error crítico al enviar.'}`
                                            }</p>
                                            {r.errors && r.errors.length > 0 && (
                                                <div className="mt-1 text-red-600 font-normal text-[10px] bg-red-100 p-2 rounded-lg">
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
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="card p-2 flex items-center gap-4 bg-white border-2 border-space-border/50 flex-1">
                        <div className="pl-3">
                            <Search className="text-space-muted" size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="flex-1 bg-transparent border-none outline-none text-space-text font-bold text-sm h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-space-bg rounded-lg border border-space-border text-[10px] font-black text-space-muted uppercase mr-2">
                             <Filter size={10} /> {filteredClients.length}
                        </div>
                    </div>
                    
                    {filteredClients.length > 0 && (
                        <button
                            onClick={toggleAll}
                            className={`px-5 h-[60px] rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                selectedEmails.size === filteredClients.length 
                                    ? 'bg-space-primary/10 border-space-primary text-space-primary' 
                                    : 'bg-white border-space-border/50 text-space-muted hover:border-space-border'
                            }`}
                        >
                            {selectedEmails.size === filteredClients.length ? <CheckSquare size={16} /> : <Square size={16} />}
                            {selectedEmails.size === filteredClients.length ? 'Deseleccionar' : 'Sel. Todos'}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : filteredClients.length === 0 ? (
                    <div className="card p-20 text-center border-dashed border-4 border-space-border/50 bg-transparent">
                        <User size={60} className="mx-auto text-space-border mb-4 opacity-50" />
                        <h3 className="text-xl font-black text-space-text uppercase tracking-tight">No hay clientes aún</h3>
                        <p className="text-sm text-space-muted font-bold mt-2 uppercase tracking-widest">Las personas que reserven aparecerán aquí automáticamente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredClients.map((client) => {
                            const status = getClientStatus(client.last_visit);
                            const isSelected = selectedEmails.has(client.email);
                            
                            return (
                                <div key={client.email} 
                                    onClick={() => toggleSelection(client.email)}
                                    className={`card p-6 border-2 transition-all group overflow-hidden relative cursor-pointer ${
                                        isSelected 
                                            ? 'bg-space-primary/5 border-space-primary shadow-sm' 
                                            : 'bg-white border-space-border/50 hover:border-space-primary/50'
                                    }`}
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-space-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700 pointer-events-none" />
                                    
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 pointer-events-none">
                                        <div className="flex items-center gap-5">
                                            {/* Checkbox */}
                                            <div className="pointer-events-auto" onClick={(e) => { e.stopPropagation(); toggleSelection(client.email); }}>
                                                {isSelected ? (
                                                    <CheckSquare size={24} className="text-space-primary" />
                                                ) : (
                                                    <Square size={24} className="text-space-border group-hover:text-space-primary/50 transition-colors" />
                                                )}
                                            </div>
                                            
                                            <div className="w-14 h-14 bg-space-text text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-black text-space-text uppercase tracking-tight">{client.name}</h3>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    <p className="text-xs text-space-muted font-bold flex items-center gap-1.5 leading-none">
                                                        <MessageSquare size={12} className="text-space-primary" /> {client.phone}
                                                    </p>
                                                    <p className="text-xs text-space-muted font-bold flex items-center gap-1.5 leading-none">
                                                        <History size={12} className="text-space-primary" /> {client.total_appointments} Visitas
                                                    </p>
                                                    <p className="text-xs text-space-muted font-bold flex items-center gap-1.5 leading-none">
                                                        hace {status.days} días
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-space-border/50">
                                            <div className="text-right flex-1 lg:flex-initial pr-4">
                                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest mb-1">Última Visita</p>
                                                <p className="text-sm font-black text-space-text uppercase tracking-tight flex items-center gap-2">
                                                    <Calendar size={14} className="text-space-primary" />
                                                    {format(new Date(client.last_visit), "d 'de' MMMM", { locale: es })}
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSendReminder(client);
                                                }}
                                                className="w-full sm:w-auto px-6 h-12 bg-gray-100 hover:bg-gray-200 text-space-text rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 pointer-events-auto"
                                            >
                                                <MessageSquare size={16} /> WA Manual
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
