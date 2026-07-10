import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import {
    Zap, Calendar, Users, Send, Clock,
    Plus, History, XCircle, Crown,
    Trash2, CheckCircle2, AlertCircle,
    Loader2, Gift, X, Check, ArrowRight
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Campaign {
    id: string;
    name: string;
    content: string;
    audience_type: 'all' | 'inactive' | 'selected';
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
    scheduled_at: string;
    sent_count: number;
    created_at: string;
}

interface TierInfo {
    tier_id: string;
    max_messages: number;
}

export default function CampaignsPage() {
    const { business, subscription } = useBusiness();
    const { } = useAuth();
    const toast = useToast();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [firingId, setFiringId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        content: '',
        audience_type: 'inactive' as 'all' | 'inactive' | 'selected',
        scheduled_at: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });

    useEffect(() => {
        if (business?.id) {
            loadCampaigns();
            loadTierInfo();
        }
    }, [business?.id]);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('marketing_campaigns')
                .select('*')
                .eq('business_id', business?.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setCampaigns(data || []);
        } catch (err) {
            console.error('Error loading campaigns:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTierInfo = async () => {
        try {
            const { data } = await supabase
                .from('business_subscriptions')
                .select('tier_id, subscription_tiers(max_marketing_messages)')
                .eq('business_id', business?.id)
                .maybeSingle();
            if (data) {
                setTierInfo({
                    tier_id: data.tier_id,
                    max_messages: (data.subscription_tiers as any)?.max_marketing_messages || 20
                });
            }
        } catch (err) {
            console.error('Error loading tier info:', err);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.content) {
            toast.error('Por favor completa todos los campos.');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('marketing_campaigns')
                .insert([{
                    business_id: business?.id,
                    name: formData.name,
                    content: formData.content,
                    audience_type: formData.audience_type,
                    scheduled_at: new Date(formData.scheduled_at).toISOString(),
                    status: 'pending'
                }]);
            if (error) throw error;
            toast.success('¡Campaña programada correctamente!');
            setIsModalOpen(false);
            setStep(1);
            setFormData({ name: '', content: '', audience_type: 'inactive', scheduled_at: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
            loadCampaigns();
        } catch (err: any) {
            toast.error('Error al crear campaña: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (campaign: Campaign) => {
        const newStatus = campaign.status === 'cancelled' ? 'pending' : 'cancelled';
        try {
            const { error } = await supabase.from('marketing_campaigns').update({ status: newStatus }).eq('id', campaign.id);
            if (error) throw error;
            loadCampaigns();
            toast.success(newStatus === 'cancelled' ? 'Campaña pausada' : 'Campaña reactivada');
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    };

    const deleteCampaign = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar esta campaña?')) return;
        try {
            const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
            if (error) throw error;
            loadCampaigns();
            toast.success('Campaña eliminada');
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    };

    const fireCampaign = async (campaign: Campaign) => {
        if (!window.confirm(`¿Enviar la campaña "${campaign.name}" ahora a todos los clientes del segmento?`)) return;
        setFiringId(campaign.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-reminders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ businessId: business?.id, campaignId: campaign.id }),
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Error al disparar campaña');
            toast.success(`✓ Campaña enviada: ${json.sent ?? 0} mensaje(s) enviados.`);
            loadCampaigns();
        } catch (err: any) {
            toast.error('Error al enviar: ' + err.message);
        } finally {
            setFiringId(null);
        }
    };

    const hasWhatsApp = subscription?.subscription_tiers?.has_whatsapp_bot || false;

    // Status badge styling
    const statusStyle = (status: Campaign['status']) => {
        if (status === 'sent') return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' };
        if (status === 'pending') return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' };
        if (status === 'processing') return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' };
        return { bg: 'rgba(149,171,138,0.1)', color: '#95ab8a', border: 'rgba(149,171,138,0.2)' };
    };

    const statusLabel = (status: Campaign['status']) => {
        if (status === 'sent') return 'Enviada';
        if (status === 'pending') return 'Pendiente';
        if (status === 'processing') return 'Enviando';
        if (status === 'cancelled') return 'Pausada';
        return 'Fallida';
    };

    if (!hasWhatsApp) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-12 space-y-8">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(155,194,135,0.1)', color: '#9bc287' }}>
                            <Zap size={24} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase italic leading-none text-[#f0f4ee]">
                            Campañas de <span className="text-[#9bc287]">WhatsApp</span>
                        </h1>
                        <p className="text-sm font-bold uppercase tracking-widest max-w-xl mx-auto mt-2 leading-relaxed text-[#95ab8a]">
                            Automatiza el envío de recordatorios y promociones masivas directo al celular de tus clientes por WhatsApp.
                        </p>
                    </div>

                    <div className="relative p-8 md:p-12 rounded-[20px] text-center space-y-8 overflow-hidden" style={{ background: '#131c17', border: '2px solid rgba(155,194,135,0.2)' }}>
                        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[80px] pointer-events-none" style={{ background: 'rgba(155,194,135,0.04)', marginRight: '-10rem', marginTop: '-10rem' }} />

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: 'rgba(155,194,135,0.1)', border: '1px solid rgba(155,194,135,0.2)', color: '#9bc287' }}>
                            <Crown size={12} /> Exclusivo Plan Essential & Premium
                        </div>

                        <div className="max-w-md mx-auto space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-tight leading-tight text-[#f0f4ee]">
                                Duplica tus reservas y recupera clientes inactivos
                            </h2>
                            <p className="text-xs font-semibold leading-relaxed uppercase text-[#95ab8a]">
                                Los mensajes de WhatsApp tienen una tasa de apertura del <strong className="text-[#9bc287]">98%</strong>. Envía recordatorios para evitar inasistencias y ofertas de agenda llena de forma 100% automatizada.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                            {[
                                { emoji: '💬', title: 'WhatsApp Masivo', desc: 'Envía ofertas a todos tus clientes con un solo clic.' },
                                { emoji: '⏰', title: 'Automatizado', desc: 'El sistema detecta clientes inactivos y los reactiva solo.' },
                                { emoji: '📊', title: 'Costo Protegido', desc: 'Hasta 400 o 1,200 mensajes incluidos según tu plan.' },
                            ].map((f, i) => (
                                <div key={i} className="p-5 rounded-2xl border" style={{ background: '#1d2a23', borderColor: '#243529' }}>
                                    <p className="text-2xl mb-2">{f.emoji}</p>
                                    <h3 className="text-xs font-black uppercase tracking-wider mb-1 text-[#f0f4ee]">{f.title}</h3>
                                    <p className="text-[10px] leading-relaxed font-semibold uppercase text-[#95ab8a]">{f.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="max-w-xs mx-auto pt-4 space-y-3">
                            <button
                                onClick={() => window.location.href = '/dashboard/billing'}
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all"
                                style={{ background: '#9bc287', color: '#22321c' }}
                            >
                                Subir de Plan Ahora <ArrowRight size={16} />
                            </button>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#95ab8a]">Habilita recordatorios automáticos subiendo tu plan</p>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(155,194,135,0.1)' }}>
                                <Zap style={{ color: '#9bc287' }} size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9bc287]">Marketing Engine</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight uppercase text-[#f0f4ee]">
                            Campañas <span className="text-[#9bc287]">&</span> Ofertas
                        </h1>
                        <p className="font-medium mt-1 text-[#95ab8a]">Programación de envíos masivos para mantener tu barbería llena.</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full md:w-auto h-12 md:h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95"
                        style={{ background: '#9bc287', color: '#22321c' }}
                    >
                        <Plus size={20} /> Nueva Campaña
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-[20px] p-6 relative overflow-hidden" style={{ background: '#131c17', border: '1px solid #243529' }}>
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Users size={80} strokeWidth={3} style={{ color: '#9bc287' }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-[#95ab8a]">Alcance Total</p>
                        <p className="text-3xl font-black tracking-tighter text-[#f0f4ee]">
                            {campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-1" style={{ color: '#22c55e' }}>
                            <CheckCircle2 size={12} /> Clientes impactados
                        </p>
                    </div>

                    <div className="rounded-[20px] p-6 relative overflow-hidden" style={{ background: '#131c17', border: '1px solid #243529' }}>
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock size={80} strokeWidth={3} style={{ color: '#9bc287' }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-[#95ab8a]">Programadas</p>
                        <p className="text-3xl font-black tracking-tighter text-[#f0f4ee]">
                            {campaigns.filter(c => c.status === 'pending').length}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-1" style={{ color: '#f59e0b' }}>
                            <Clock size={12} /> En cola de envío
                        </p>
                    </div>

                    <div className="rounded-[20px] p-6 relative overflow-hidden" style={{ background: '#131c17', border: '1px solid rgba(155,194,135,0.3)' }}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Gift size={80} strokeWidth={3} style={{ color: '#9bc287' }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-[#9bc287]">Límite del Plan ({tierInfo?.tier_id})</p>
                        <p className="text-3xl font-black tracking-tighter text-[#f0f4ee]">
                            {tierInfo?.max_messages} <span className="text-lg text-[#95ab8a]">mensajes</span>
                        </p>
                        <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(155,194,135,0.15)' }}>
                            <div className="h-full rounded-full" style={{ width: '15%', background: '#9bc287' }} />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest mt-2 text-[#95ab8a]">
                            Sube a Premium para envíos ilimitados
                        </p>
                    </div>
                </div>

                {/* Campaign List */}
                <div className="rounded-[20px] overflow-hidden" style={{ background: '#131c17', border: '1px solid #243529' }}>
                    <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #243529', background: 'rgba(29,42,35,0.5)' }}>
                        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#f0f4ee]">
                            <History size={18} style={{ color: '#9bc287' }} /> Historial de Campañas
                        </h2>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin" size={32} style={{ color: '#9bc287' }} />
                            <p className="text-xs font-bold uppercase tracking-widest text-[#95ab8a]">Cargando campañas...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-center px-6">
                            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-2" style={{ background: '#1d2a23', color: '#95ab8a' }}>
                                <Zap size={32} />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-[#f0f4ee]">No hay campañas aún</h3>
                            <p className="text-sm max-w-xs text-[#95ab8a]">Empieza a crear ofertas para que tus clientes vuelvan hoy mismo.</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="mt-4 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                                style={{ background: 'rgba(155,194,135,0.1)', color: '#9bc287', border: '1px solid rgba(155,194,135,0.2)' }}
                            >
                                Crear mi primera campaña
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr style={{ background: 'rgba(29,42,35,0.3)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#95ab8a]">Campaña</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#95ab8a]">Programación</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#95ab8a] text-center">Audiencia</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#95ab8a] text-center">Estado</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#95ab8a] text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((campaign, idx) => {
                                        const s = statusStyle(campaign.status);
                                        return (
                                            <tr key={campaign.id} style={{ borderTop: idx > 0 ? '1px solid #243529' : 'none' }}>
                                                <td className="px-6 py-5">
                                                    <p className="font-black uppercase tracking-tight text-[#f0f4ee]">{campaign.name}</p>
                                                    <p className="text-xs truncate max-w-[200px] mt-1 italic text-[#95ab8a]">"{campaign.content}"</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} style={{ color: '#9bc287' }} />
                                                        <span className="text-xs font-bold text-[#f0f4ee]">
                                                            {format(new Date(campaign.scheduled_at), "d 'de' MMMM", { locale: es })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock size={14} style={{ color: '#95ab8a' }} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#95ab8a]">
                                                            {format(new Date(campaign.scheduled_at), "HH:mm 'hs'")}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                                                        style={campaign.audience_type === 'all'
                                                            ? { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }
                                                            : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
                                                        }>
                                                        {campaign.audience_type === 'all' ? 'Todos' : 'Inactivos'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${campaign.status === 'pending' ? 'animate-pulse' : ''}`}
                                                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                                                            {campaign.status === 'sent' ? <CheckCircle2 size={10} /> :
                                                             campaign.status === 'pending' ? <Clock size={10} /> :
                                                             campaign.status === 'processing' ? <Loader2 size={10} className="animate-spin" /> :
                                                             <XCircle size={10} />}
                                                            {statusLabel(campaign.status)}
                                                        </span>
                                                        {campaign.sent_count > 0 && (
                                                            <span className="text-[9px] font-bold text-[#95ab8a]">{campaign.sent_count} envíos</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(campaign.status === 'pending' || campaign.status === 'cancelled') && (
                                                            <button
                                                                onClick={() => fireCampaign(campaign)}
                                                                disabled={firingId === campaign.id}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                                style={{ background: '#9bc287', color: '#22321c' }}
                                                            >
                                                                {firingId === campaign.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                                                {firingId === campaign.id ? 'Enviando...' : 'Enviar'}
                                                            </button>
                                                        )}
                                                        {campaign.status === 'pending' && (
                                                            <button
                                                                onClick={() => toggleStatus(campaign)}
                                                                className="p-2 rounded-xl transition-all"
                                                                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                                                                title="Pausar"
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteCampaign(campaign.id)}
                                                            className="p-2 rounded-xl transition-all"
                                                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Nueva Campaña Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 lg:p-8">
                        <div className="absolute inset-0 backdrop-blur-md" style={{ background: 'rgba(9,13,11,0.85)' }} onClick={() => setIsModalOpen(false)} />

                        <div className="relative w-full max-w-4xl rounded-[20px] overflow-hidden" style={{ background: '#131c17', border: '2px solid #243529' }}>
                            {/* Modal Header */}
                            <div className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid #243529', background: 'rgba(29,42,35,0.5)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#9bc287' }}>
                                        <Zap size={24} style={{ color: '#22321c' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-tight text-[#f0f4ee]">Nueva Campaña</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#95ab8a]">Paso {step} de 3</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                                    style={{ background: '#1d2a23', border: '1px solid #243529', color: '#95ab8a' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#95ab8a'; }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCampaign} className="flex flex-col lg:flex-row h-full max-h-[75vh] overflow-hidden">
                                {/* Left: Editor */}
                                <div className="flex-1 p-8 overflow-y-auto space-y-6" style={{ borderRight: '1px solid #243529' }}>
                                    {step === 1 && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 text-[#95ab8a]">Nombre de la Campaña (Interno)</label>
                                                <input
                                                    type="text" required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                                    placeholder="Ej: Promo de Lunes 15 de Abril"
                                                    className="w-full h-14 rounded-2xl px-6 text-sm font-bold outline-none transition-all placeholder:text-[#95ab8a]/30"
                                                    style={{ background: '#1d2a23', border: '2px solid #243529', color: '#f0f4ee' }}
                                                    onFocus={e => { e.currentTarget.style.borderColor = '#9bc287'; }}
                                                    onBlur={e => { e.currentTarget.style.borderColor = '#243529'; }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 text-[#95ab8a]">Contenido de la Oferta / Mensaje</label>
                                                <textarea
                                                    required
                                                    value={formData.content}
                                                    onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                                                    rows={5}
                                                    placeholder="Ej: ¡2x1 en cortes de barba solo por hoy! 🔥"
                                                    className="w-full rounded-[20px] p-6 text-sm font-bold outline-none transition-all placeholder:text-[#95ab8a]/30 resize-none"
                                                    style={{ background: '#1d2a23', border: '2px solid #243529', color: '#f0f4ee' }}
                                                    onFocus={e => { e.currentTarget.style.borderColor = '#9bc287'; }}
                                                    onBlur={e => { e.currentTarget.style.borderColor = '#243529'; }}
                                                />
                                                <p className="text-[9px] font-bold uppercase tracking-widest ml-2 flex items-center gap-1 text-[#95ab8a]">
                                                    <AlertCircle size={10} /> Este texto se insertará en tu plantilla master de Twilio.
                                                </p>
                                            </div>
                                            <button type="button" onClick={() => setStep(2)}
                                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all"
                                                style={{ background: '#f0f4ee', color: '#22321c' }}>
                                                Siguiente Paso <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 text-[#95ab8a]">Selecciona la Audiencia</label>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {[
                                                        { type: 'inactive' as const, icon: Clock, title: 'Solo Clientes Inactivos', desc: `Aquellos que no han venido en ${business?.reminder_inactive_days || 14} días` },
                                                        { type: 'all' as const, icon: Users, title: 'Toda mi Base de Datos', desc: 'Enviar a cada cliente que ha visitado tu barbería' },
                                                    ].map(opt => (
                                                        <button key={opt.type} type="button"
                                                            onClick={() => setFormData(p => ({ ...p, audience_type: opt.type }))}
                                                            className="p-6 rounded-[20px] flex items-center gap-4 text-left transition-all border-2"
                                                            style={{
                                                                borderColor: formData.audience_type === opt.type ? '#9bc287' : '#243529',
                                                                background: formData.audience_type === opt.type ? 'rgba(155,194,135,0.05)' : '#1d2a23',
                                                            }}>
                                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                                                style={{
                                                                    background: formData.audience_type === opt.type ? '#9bc287' : '#131c17',
                                                                    color: formData.audience_type === opt.type ? '#22321c' : '#95ab8a',
                                                                }}>
                                                                <opt.icon size={24} />
                                                            </div>
                                                            <div>
                                                                <p className="font-black uppercase tracking-tight text-[#f0f4ee]">{opt.title}</p>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#95ab8a]">{opt.desc}</p>
                                                            </div>
                                                            {formData.audience_type === opt.type && <Check className="ml-auto" size={24} style={{ color: '#9bc287' }} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button type="button" onClick={() => setStep(1)}
                                                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border"
                                                    style={{ background: '#1d2a23', color: '#f0f4ee', borderColor: '#243529' }}>
                                                    Atrás
                                                </button>
                                                <button type="button" onClick={() => setStep(3)}
                                                    className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all"
                                                    style={{ background: '#f0f4ee', color: '#22321c' }}>
                                                    Programar Envío <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 text-[#95ab8a]">¿Cuándo quieres que se envíe?</label>
                                                <div className="p-8 rounded-[20px] flex flex-col items-center gap-6" style={{ background: 'rgba(155,194,135,0.05)', border: '2px solid rgba(155,194,135,0.2)' }}>
                                                    <Calendar style={{ color: '#9bc287' }} size={48} strokeWidth={3} />
                                                    <input
                                                        type="datetime-local"
                                                        value={formData.scheduled_at}
                                                        onChange={(e) => setFormData(p => ({ ...p, scheduled_at: e.target.value }))}
                                                        className="w-full h-16 rounded-2xl px-6 text-xl font-black outline-none transition-all text-center"
                                                        style={{ background: '#1d2a23', border: '2px solid #243529', color: '#f0f4ee' }}
                                                    />
                                                    <p className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full" style={{ color: '#9bc287', background: 'rgba(155,194,135,0.1)', border: '1px solid rgba(155,194,135,0.2)' }}>
                                                        Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button type="button" onClick={() => setStep(2)}
                                                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border"
                                                    style={{ background: '#1d2a23', color: '#f0f4ee', borderColor: '#243529' }}>
                                                    Atrás
                                                </button>
                                                <button type="submit" disabled={submitting}
                                                    className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                                                    style={{ background: '#9bc287', color: '#22321c' }}>
                                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                                                    {submitting ? 'Creando...' : 'Confirmar y Programar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Live Preview */}
                                <div className="hidden lg:flex flex-[0.8] p-8 flex-col items-center justify-center relative" style={{ background: '#1d2a23' }}>
                                    <div className="absolute top-6 left-8">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#95ab8a]">Vista Previa Real</p>
                                    </div>
                                    <div className="w-full max-w-[300px] bg-[#E3FFCA] rounded-[1.5rem] rounded-tr-none p-5 shadow-sm border border-[#C5EB9E] relative">
                                        <div className="absolute top-0 right-[-8px] w-0 h-0 border-t-[12px] border-t-[#E3FFCA] border-r-[12px] border-r-transparent" />
                                        <div className="space-y-3">
                                            <p className="text-[13px] leading-relaxed text-[#111b21]">
                                                ¡Hola <span className="text-blue-600 font-bold">Cliente</span>! Soy <span className="font-bold">{business?.name || 'Tu Barbero'}</span>. Te tengo este mensaje:
                                            </p>
                                            <div className="bg-white/40 p-3 rounded-xl border border-white/50 backdrop-blur-sm">
                                                <p className="text-[14px] font-bold text-[#111b21] italic">
                                                    {formData.content || 'Escribe tu oferta para verla aquí...'}
                                                </p>
                                            </div>
                                            <p className="text-[13px] leading-relaxed text-[#111b21]">
                                                Reserva aquí: <span className="text-blue-500 underline">spacey.reserve/book/{business?.slug}</span>
                                            </p>
                                            <div className="flex justify-end gap-1 items-center mt-2">
                                                <span className="text-[10px] text-[#667781]">10:05 AM</span>
                                                <Check className="text-[#53bdeb]" size={12} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 px-4 text-center">
                                        <p className="text-[11px] font-bold uppercase tracking-widest leading-loose text-[#95ab8a]">
                                            Así se inyecta tu mensaje en la <br />
                                            <span style={{ color: '#9bc287' }}>Plantilla Maestra de Twilio</span>
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
