import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { 
    Zap, Calendar, Users, Send, Clock, 
    Plus, History, XCircle,
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
    const { business } = useBusiness();
    const { user } = useAuth();
    const toast = useToast();
    
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [firingId, setFiringId] = useState<string | null>(null);

    // New Campaign Form
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
            const { data, error } = await supabase
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
            setFormData({
                name: '',
                content: '',
                audience_type: 'inactive',
                scheduled_at: format(new Date(), "yyyy-MM-dd'T'HH:mm")
            });
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
            const { error } = await supabase
                .from('marketing_campaigns')
                .update({ status: newStatus })
                .eq('id', campaign.id);
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    businessId: business?.id,
                    campaignId: campaign.id,
                }),
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Error al disparar campaña');

            toast.success(`✅ Campaña enviada: ${json.sent ?? 0} mensaje(s) enviados.`);
            loadCampaigns();
        } catch (err: any) {
            toast.error('Error al enviar: ' + err.message);
        } finally {
            setFiringId(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* ── HEADER ────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-space-primary/10 rounded-lg flex items-center justify-center">
                                <Zap className="text-space-primary" size={18} />
                            </div>
                            <span className="text-[10px] font-black text-space-primary uppercase tracking-[0.2em]">Marketing Engine</span>
                        </div>
                        <h1 className="text-4xl font-black text-space-text tracking-tight uppercase italic italic-none">
                            Campañas <span className="text-space-primary">&</span> Ofertas
                        </h1>
                        <p className="text-space-muted font-medium mt-2">Programación de envíos masivos para mantener tu barbería llena.</p>
                    </div>

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="h-14 px-8 bg-space-primary hover:bg-space-primary-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-space-primary/20"
                    >
                        <Plus size={20} /> Nueva Campaña
                    </button>
                </div>

                {/* ── STATS & LIMITS ────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border-2 border-space-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={80} strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-black text-space-muted uppercase tracking-widest mb-1">Alcance Total</p>
                        <p className="text-3xl font-black text-space-text tracking-tighter">
                            {campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)}
                        </p>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Clientes impactados
                        </p>
                    </div>

                    <div className="bg-white border-2 border-space-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Clock size={80} strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-black text-space-muted uppercase tracking-widest mb-1">Programadas</p>
                        <p className="text-3xl font-black text-space-text tracking-tighter">
                            {campaigns.filter(c => c.status === 'pending').length}
                        </p>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                            <Clock size={12} /> En cola de envío
                        </p>
                    </div>

                    <div className="bg-space-card2 border-2 border-space-primary/30 p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Gift size={80} strokeWidth={3} className="text-space-primary" />
                        </div>
                        <p className="text-[10px] font-black text-space-primary uppercase tracking-widest mb-1">Límite del Plan ({tierInfo?.tier_id})</p>
                        <p className="text-3xl font-black text-space-text tracking-tighter">
                            {tierInfo?.max_messages} <span className="text-lg text-space-muted">mensajes</span>
                        </p>
                        <div className="w-full h-1.5 bg-white/50 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-space-primary" style={{ width: '15%' }}></div>
                        </div>
                        <p className="text-[9px] font-bold text-space-muted uppercase tracking-widest mt-2">
                            Sube a Premium para envíos ilimitados
                        </p>
                    </div>
                </div>

                {/* ── CAMPAIGN LIST ─────────────────────────────────── */}
                <div className="bg-white border-2 border-space-border rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b-2 border-space-border flex items-center justify-between bg-space-card2/50">
                        <h2 className="text-sm font-black text-space-text uppercase tracking-widest flex items-center gap-2">
                            <History size={18} className="text-space-primary" /> Historial de Campañas
                        </h2>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-space-primary" size={32} />
                            <p className="text-xs font-bold text-space-muted uppercase tracking-widest">Cargando campañas...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-center px-6">
                            <div className="w-16 h-16 bg-space-card2 rounded-3xl flex items-center justify-center text-space-muted mb-2">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-lg font-black text-space-text uppercase tracking-tight">No hay campañas aún</h3>
                            <p className="text-sm text-space-muted max-w-xs font-medium">Empieza a crear ofertas para que tus clientes vuelvan hoy mismo.</p>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="mt-4 px-6 py-3 bg-space-primary/10 hover:bg-space-primary/20 text-space-primary rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                Crear mi primera campaña
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-space-card/30">
                                        <th className="px-8 py-4 text-[10px] font-black text-space-muted uppercase tracking-widest">Campaña</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-space-muted uppercase tracking-widest">Programación</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-space-muted uppercase tracking-widest text-center">Audiencia</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-space-muted uppercase tracking-widest text-center">Estado</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-space-muted uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-space-border">
                                    {campaigns.map((campaign) => (
                                        <tr key={campaign.id} className="hover:bg-space-card2/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <p className="font-black text-space-text uppercase tracking-tight">{campaign.name}</p>
                                                <p className="text-xs text-space-muted truncate max-w-[200px] mt-1 italic font-medium">"{campaign.content}"</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-space-primary" />
                                                    <span className="text-xs font-bold text-space-text">
                                                        {format(new Date(campaign.scheduled_at), "d 'de' MMMM", { locale: es })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock size={14} className="text-space-muted" />
                                                    <span className="text-[10px] font-black text-space-muted uppercase tracking-widest">
                                                        {format(new Date(campaign.scheduled_at), "HH:mm 'hs'")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    campaign.audience_type === 'all' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                                }`}>
                                                    {campaign.audience_type === 'all' ? 'Todos' : 'Inactivos'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        campaign.status === 'sent' ? 'bg-green-100 text-green-600' :
                                                        campaign.status === 'pending' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                                                        campaign.status === 'processing' ? 'bg-blue-100 text-blue-600 animate-spin-slow' :
                                                        'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {campaign.status === 'sent' ? <CheckCircle2 size={10} /> : 
                                                         campaign.status === 'pending' ? <Clock size={10} /> :
                                                         campaign.status === 'processing' ? <Loader2 size={10} className="animate-spin" /> :
                                                         <XCircle size={10} />}
                                                        {campaign.status === 'sent' ? 'Enviada' : 
                                                         campaign.status === 'pending' ? 'Pendiente' :
                                                         campaign.status === 'processing' ? 'Enviando' :
                                                         campaign.status === 'cancelled' ? 'Pausada' : 'Fallida'}
                                                    </span>
                                                    {campaign.sent_count > 0 && (
                                                        <span className="text-[9px] font-bold text-space-muted">
                                                            {campaign.sent_count} envíos
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* SEND NOW button — most important action */}
                                                    {(campaign.status === 'pending' || campaign.status === 'cancelled') && (
                                                        <button 
                                                            onClick={() => fireCampaign(campaign)}
                                                            disabled={firingId === campaign.id}
                                                            className="flex items-center gap-2 px-4 py-2 bg-space-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-space-primary/90 transition-all disabled:opacity-50"
                                                            title="Enviar Ahora"
                                                        >
                                                            {firingId === campaign.id 
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <Send size={14} />}
                                                            {firingId === campaign.id ? 'Enviando...' : 'Enviar'}
                                                        </button>
                                                    )}
                                                    {campaign.status === 'pending' && (
                                                        <button 
                                                            onClick={() => toggleStatus(campaign)}
                                                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-all"
                                                            title="Pausar"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => deleteCampaign(campaign.id)}
                                                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── MODAL: NUEVA CAMPAÑA ─────────────────────────── */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 lg:p-8">
                        <div className="absolute inset-0 bg-space-text/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                        
                        <div className="relative w-full max-w-4xl bg-white border-4 border-space-border rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b-2 border-space-border flex items-center justify-between bg-space-card2/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-space-primary rounded-2xl flex items-center justify-center text-white shadow-btn">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-space-text uppercase tracking-tight">Nueva Campaña</h2>
                                        <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">Paso {step} de 3</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white border-2 border-space-border rounded-xl flex items-center justify-center text-space-muted hover:text-space-danger transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCampaign} className="flex flex-col lg:flex-row h-full max-h-[80vh] overflow-hidden">
                                {/* Left Side: Editor */}
                                <div className="flex-1 p-10 overflow-y-auto space-y-8 border-r-2 border-space-border">
                                    {step === 1 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2">Nombre de la Campaña (Interno)</label>
                                                <input 
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                                    placeholder="Ej: Promo de Lunes 15 de Abril"
                                                    className="w-full h-14 bg-space-card2 border-2 border-space-border rounded-2xl px-6 text-sm font-bold text-space-text focus:border-space-primary outline-none transition-all placeholder:text-space-muted/30"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2">Contenido de la Oferta / Mensaje</label>
                                                <textarea 
                                                    required
                                                    value={formData.content}
                                                    onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                                                    rows={5}
                                                    placeholder="Ej: ¡2x1 en cortes de barba solo por hoy! 🔥"
                                                    className="w-full bg-space-card2 border-2 border-space-border rounded-[2rem] p-6 text-sm font-bold text-space-text focus:border-space-primary outline-none transition-all placeholder:text-space-muted/30 resize-none"
                                                />
                                                <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest ml-2 flex items-center gap-1">
                                                    <AlertCircle size={10} /> Este texto se insertará en tu plantilla master de Twilio.
                                                </p>
                                            </div>

                                            <button 
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="w-full h-14 bg-space-text text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                            >
                                                Siguiente Paso <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2">Selecciona la Audiencia</label>
                                                
                                                <div className="grid grid-cols-1 gap-4">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, audience_type: 'inactive' }))}
                                                        className={`p-6 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left ${formData.audience_type === 'inactive' ? 'border-space-primary bg-space-primary/5' : 'border-space-border bg-white hover:bg-space-card2'}`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.audience_type === 'inactive' ? 'bg-space-primary text-white' : 'bg-space-card2 text-space-muted'}`}>
                                                            <Clock size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-space-text uppercase tracking-tight">Solo Clientes Inactivos</p>
                                                            <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">Aquellos que no han venido en {business?.reminder_inactive_days || 14} días</p>
                                                        </div>
                                                        {formData.audience_type === 'inactive' && <Check className="ml-auto text-space-primary" size={24} />}
                                                    </button>

                                                    <button 
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, audience_type: 'all' }))}
                                                        className={`p-6 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left ${formData.audience_type === 'all' ? 'border-space-primary bg-space-primary/5' : 'border-space-border bg-white hover:bg-space-card2'}`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.audience_type === 'all' ? 'bg-space-primary text-white' : 'bg-space-card2 text-space-muted'}`}>
                                                            <Users size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-space-text uppercase tracking-tight">Toda mi Base de Datos</p>
                                                            <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">Enviar a cada cliente que ha visitado tu barbería</p>
                                                        </div>
                                                        {formData.audience_type === 'all' && <Check className="ml-auto text-space-primary" size={24} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className="flex-1 h-14 bg-space-card2 text-space-text border-2 border-space-border rounded-2xl font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-all"
                                                >
                                                    Atrás
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setStep(3)}
                                                    className="flex-[2] h-14 bg-space-text text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                                >
                                                    Programar Envío <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2">¿Cuándo quieres que se envíe?</label>
                                                
                                                <div className="p-8 bg-space-primary/5 border-2 border-space-primary/20 rounded-[2.5rem] flex flex-col items-center gap-6">
                                                    <Calendar className="text-space-primary" size={48} strokeWidth={3} />
                                                    <input 
                                                        type="datetime-local"
                                                        value={formData.scheduled_at}
                                                        onChange={(e) => setFormData(p => ({ ...p, scheduled_at: e.target.value }))}
                                                        className="w-full h-16 bg-white border-2 border-space-border rounded-2xl px-6 text-xl font-black text-space-text focus:border-space-primary outline-none transition-all text-center"
                                                    />
                                                    <p className="text-[10px] text-space-primary font-black uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-space-primary/10">
                                                        Zona horaria detectada: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setStep(2)}
                                                    className="flex-1 h-14 bg-space-card2 text-space-text border-2 border-space-border rounded-2xl font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-all"
                                                >
                                                    Atrás
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="flex-[2] h-14 bg-space-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-space-primary/30 disabled:opacity-50"
                                                >
                                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                                                    {submitting ? 'Creando...' : 'Confirmar y Programar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Live Preview */}
                                <div className="hidden lg:flex flex-[0.8] bg-space-card2 p-10 flex-col items-center justify-center relative">
                                    <div className="absolute top-8 left-10">
                                        <p className="text-[10px] font-black text-space-muted uppercase tracking-[0.3em]">Vista Previa Real</p>
                                    </div>

                                    {/* WhatsApp Bubble */}
                                    <div className="w-full max-w-[320px] bg-[#E3FFCA] rounded-[1.5rem] rounded-tr-none p-5 shadow-sm border border-[#C5EB9E] relative">
                                        <div className="absolute top-0 right-[-8px] w-0 h-0 border-t-[12px] border-t-[#E3FFCA] border-r-[12px] border-r-transparent"></div>
                                        
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
                                                Aprovecha y reserva aquí: <span className="text-blue-500 underline">spacey.reserve/book/{business?.slug}</span>
                                            </p>

                                            <div className="flex justify-end gap-1 items-center mt-2">
                                                <span className="text-[10px] text-[#667781]">10:05 AM</span>
                                                <Check className="text-[#53bdeb]" size={12} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 px-6 text-center">
                                        <p className="text-[11px] font-bold text-space-muted uppercase tracking-widest leading-loose">
                                            Así es como se inyecta tu mensaje en la <br/> 
                                            <span className="text-space-primary">Plantilla Maestra de Twilio</span>
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
