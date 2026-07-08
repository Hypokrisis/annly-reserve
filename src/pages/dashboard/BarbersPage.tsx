import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Users as UsersIcon, ShieldAlert, UserMinus, Crown } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { usePermissions } from '@/hooks/usePermissions';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/contexts/ToastContext';
import type { Barber } from '@/types';

export default function BarbersPage() {
    const navigate = useNavigate();
    const { barbers, loading, createBarber, updateBarber, deleteBarber, hardDeleteBarber, getBarberServices } = useBarbers();
    const { services } = useServices();
    const { canManageBarbers } = usePermissions();
    const { business, subscription } = useBusiness();
    const toast = useToast();

    const [showLimitModal, setShowLimitModal] = useState(false);

    // ── Analytics per barber ──
    type BarberStats = { total: number; thisMonth: number; thisWeek: number };
    const [barberStats, setBarberStats] = useState<Record<string, BarberStats>>({});

    useEffect(() => {
        if (business?.id && barbers.length > 0) {
            loadBarberStats();
        }
    }, [business?.id, barbers.length]);

    const loadBarberStats = async () => {
        if (!business?.id) return;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];

        const { data } = await supabase
            .from('appointments')
            .select('barber_id, appointment_date')
            .eq('business_id', business.id)
            .in('status', ['confirmed', 'completed']);

        if (!data) return;

        const stats: Record<string, BarberStats> = {};
        for (const apt of data) {
            if (!apt.barber_id) continue;
            if (!stats[apt.barber_id]) stats[apt.barber_id] = { total: 0, thisMonth: 0, thisWeek: 0 };
            stats[apt.barber_id].total++;
            if (apt.appointment_date >= monthStart) stats[apt.barber_id].thisMonth++;
            if (apt.appointment_date >= weekStart) stats[apt.barber_id].thisWeek++;
        }
        setBarberStats(stats);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        user_id: '',
        email: '',
        phone: '',
        bio: '',
        avatar_url: '',
    });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleOpenModal = async (barber?: Barber) => {
        if (!barber) {
            const maxBarbers = subscription?.subscription_tiers?.max_barbers || 3;
            const activeBarbersCount = barbers.filter(b => b.is_active).length;
            if (activeBarbersCount >= maxBarbers) {
                setShowLimitModal(true);
                return;
            }
        }
        if (barber) {
            setEditingBarber(barber);
            setFormData({
                name: barber.name,
                user_id: barber.user_id || '',
                email: barber.email || '',
                phone: barber.phone || '',
                bio: barber.bio || '',
                avatar_url: barber.avatar_url || '',
            });

            // Load barber's services
            const barberServiceIds = await getBarberServices(barber.id);
            setSelectedServices(barberServiceIds);
        } else {
            setEditingBarber(null);
            setFormData({
                name: '',
                user_id: '',
                email: '',
                phone: '',
                bio: '',
                avatar_url: '',
            });
            setSelectedServices([]);
        }
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBarber(null);
        setFormData({ name: '', user_id: '', email: '', phone: '', bio: '', avatar_url: '' });
        setSelectedServices([]);
        setFormErrors({});
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'El nombre es requerido';
        }

        if (selectedServices.length === 0) {
            errors.services = 'Debe seleccionar al menos un servicio';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const barberData = {
            name: formData.name.trim(),
            user_id: formData.user_id.trim() || undefined,
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            avatar_url: formData.avatar_url || undefined,
            bio: formData.bio.trim() || undefined,
            service_ids: selectedServices,
        };

        let success = false;

        if (editingBarber) {
            const result = await updateBarber(editingBarber.id, barberData);
            success = result !== null;
        } else {
            const result = await createBarber(barberData);
            success = result !== null;
        }

        if (success) {
            handleCloseModal();
        }
    };

    const handleDelete = async (barber: Barber) => {
        if (!confirm(`¿Estás seguro de desactivar a "${barber.name}"? El barbero dejará de estar disponible para reservas.`)) return;
        await deleteBarber(barber.id);
    };

    const handleHardDelete = async (barber: Barber) => {
        const { data: activeApts } = await supabase
            .from('appointments')
            .select('id')
            .eq('barber_id', barber.id)
            .eq('status', 'confirmed')
            .limit(1);

        if (activeApts && activeApts.length > 0) {
            toast.error('No se puede eliminar: este barbero tiene citas CONFIRMADAS activas.');
            return;
        }

        if (!confirm(`⚠️ ALERTA DE SEGURIDAD\n\n¿Estás ABSOLUTAMENTE seguro de eliminar permanentemente a "${barber.name}"?\n\n- Se borrará su perfil y asociaciones.\n- Las citas históricas mostrarán "Barbero eliminado".\n- Esta acción NO se puede deshacer.`)) return;

        await hardDeleteBarber(barber.id);
    };

    const toggleService = (serviceId: string) => {
        setSelectedServices((prev: string[]) =>
            prev.includes(serviceId)
                ? prev.filter((id: string) => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    if (!canManageBarbers) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-space-muted">No tienes permisos para gestionar barberos.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-[#f0f4ee]">Equipo</h1>
                        <p className="mt-0.5 text-xs text-[#95ab8a]">Coordina tu equipo y disponibilidad</p>
                    </div>
                    <button onClick={() => handleOpenModal()}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#9bc287] px-5 py-2.5 text-sm font-extrabold text-[#22321c] transition hover:bg-[#86ad72] sm:w-auto">
                        <Plus size={16} /> Añadir barbero
                    </button>
                </div>

                {/* Barbers List */}
                {loading && barbers.length === 0 ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : barbers.length === 0 ? (
                    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-[#243529] bg-[#131c17] p-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d2a23]">
                            <UsersIcon size={28} className="text-[#95ab8a]" />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-[#f0f4ee]">Equipo vacío</h3>
                        <p className="mb-6 max-w-xs text-sm text-[#95ab8a]">Agrega tu primer barbero para empezar a recibir citas.</p>
                        <button onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 rounded-full bg-[#9bc287] px-5 py-2.5 text-sm font-extrabold text-[#22321c] transition hover:bg-[#86ad72]">
                            <Plus size={16} /> Crear barbero
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {barbers.map((barber) => (
                            <div key={barber.id}
                                className={`rounded-[20px] border border-[#243529] bg-[#131c17] p-5 transition hover:border-[#9bc287]/30 ${!barber.is_active ? 'opacity-60' : ''}`}>
                                <div className="flex flex-col gap-4">
                                    <div className="flex min-w-0 flex-1 items-start gap-4">
                                        {barber.avatar_url ? (
                                            <img src={barber.avatar_url} alt={barber.name}
                                                className={`h-12 w-12 shrink-0 rounded-2xl object-cover ${!barber.is_active ? 'grayscale' : ''}`} />
                                        ) : (
                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white ${barber.is_active ? '' : 'opacity-60'}`}
                                                style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                                                {barber.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-bold text-[#f0f4ee] sm:text-base">{barber.name}</h3>
                                                {!barber.is_active && (
                                                    <span className="rounded-full bg-[#95ab8a]/10 px-2 py-0.5 text-[9px] font-bold uppercase text-[#95ab8a]">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            {barber.bio && <p className="mb-1.5 line-clamp-1 text-xs text-[#95ab8a]">{barber.bio}</p>}
                                            <div className="flex flex-col gap-1">
                                                {barber.email && <span className="overflow-hidden text-ellipsis text-[10px] text-[#95ab8a]">{barber.email}</span>}
                                                {barber.phone && <span className="text-[10px] font-bold tracking-wider text-[#95ab8a]">{barber.phone}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {barberStats[barber.id] && (
                                        <div className="my-1 grid grid-cols-3 gap-2 border-b border-t border-[#243529]/40 py-3">
                                            <div className="text-center">
                                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#95ab8a]">Total</p>
                                                <p className="text-lg font-extrabold text-[#f0f4ee]">{barberStats[barber.id].total}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#95ab8a]">Este mes</p>
                                                <p className="text-lg font-extrabold text-[#9bc287]">{barberStats[barber.id].thisMonth}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#95ab8a]">Esta semana</p>
                                                <p className="text-lg font-extrabold text-[#22c55e]">{barberStats[barber.id].thisWeek}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-[#243529]/40 pt-4">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => handleOpenModal(barber)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#243529] text-[#95ab8a] transition hover:border-[#9bc287]/40 hover:text-[#9bc287]" title="Editar">
                                                <Edit2 size={14} />
                                            </button>
                                            {barber.is_active ? (
                                                <button onClick={() => handleDelete(barber)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#243529] text-[#95ab8a] transition hover:border-[#ef4444]/40 hover:text-[#ef4444]" title="Desactivar">
                                                    <UserMinus size={14} />
                                                </button>
                                            ) : (
                                                <button onClick={() => updateBarber(barber.id, { is_active: true })}
                                                    className="h-9 rounded-xl border border-[#22c55e]/20 bg-[#1d2a23] px-3 text-[10px] font-extrabold text-[#22c55e] transition hover:bg-[#22c55e] hover:text-white">
                                                    Activar
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => handleHardDelete(barber)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ef4444]/20 text-[#ef4444] transition hover:bg-[#ef4444] hover:text-white" title="Eliminar permanentemente">
                                            <ShieldAlert size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <Modal isOpen={isModalOpen} onClose={handleCloseModal}
                    title={editingBarber ? 'Editar Barbero' : 'Nuevo Barbero'} size="lg">
                    <form onSubmit={handleSubmit} className="space-y-6 px-1 pr-3">
                        <div className="space-y-4 pb-24">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-28">
                                    <ImageUploadWithCrop
                                        label="Foto del barbero"
                                        value={formData.avatar_url}
                                        onUploadComplete={(url) => setFormData(p => ({ ...p, avatar_url: url }))}
                                        aspect={1}
                                    />
                                </div>
                            </div>

                            <Input label="Nombre" value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={formErrors.name} placeholder="Ej: Juan Pérez" required />

                            <Input label="ID de Usuario vinculado (opcional)" value={formData.user_id}
                                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                placeholder="UUID del usuario" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label="Email" type="email" value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="juan@ejemplo.com" />
                                <Input label="Teléfono" type="tel" value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(809) 555-5555" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 mb-1.5 block">Biografía</label>
                                <textarea value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-5 py-3 bg-space-card2 border border-space-border/40 rounded-2xl text-sm font-medium text-space-text focus:bg-space-card focus:ring-4 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-space-muted/40 resize-none min-h-[80px]" placeholder="Información sobre el barbero" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 mb-1.5 block">Servicios que ofrece <span className="text-space-danger">*</span></label>
                                {services.length === 0 ? (
                                    <p className="text-sm text-space-muted italic p-4 bg-neutral-50 rounded-xl border border-dashed border-space-border">No hay servicios creados aún. Ve a la página de Servicios primero.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-space-border/30 rounded-2xl p-3 bg-space-card2/50">
                                        {services.map((service) => (
                                            <label key={service.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedServices.includes(service.id) ? 'bg-space-card border-space-primary shadow-sm' : 'bg-transparent border-transparent hover:bg-space-card/50'}`}>
                                                <input type="checkbox"
                                                    checked={selectedServices.includes(service.id)}
                                                    onChange={() => toggleService(service.id)}
                                                    className="w-4 h-4 text-space-primary rounded border-space-border focus:ring-space-primary" />
                                                <span className="text-xs font-bold text-space-text truncate">{service.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {formErrors.services && <p className="mt-1.5 text-[10px] font-bold text-space-danger uppercase ml-2 select-none tracking-wider">{formErrors.services}</p>}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-space-border sticky bottom-0 bg-space-card z-10 pb-2">
                            <button type="button" onClick={handleCloseModal} className="btn-secondary w-full sm:w-auto h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-space-primary/15">
                                {loading ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Limit Gating Modal */}
                <Modal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)}
                    title="👑 Plan Superior Requerido" size="md">
                    <div className="p-6 text-center space-y-6">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <ShieldAlert size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-space-text">Límite de Barberos Alcanzado</h3>
                            <p className="text-space-muted text-sm leading-relaxed">
                                Tu plan actual <strong>{subscription?.subscription_tiers?.name || 'Spacey Starter'}</strong> te permite tener hasta <strong>{subscription?.subscription_tiers?.max_barbers || 3} barberos</strong> activos.
                            </p>
                            <p className="text-space-muted text-xs leading-relaxed font-semibold">
                                Sube a un plan superior para expandir tu equipo, habilitar más cuentas de acceso y seguir creciendo de forma ordenada.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={() => navigate('/dashboard/billing')}
                                className="btn-primary w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-space-primary/20"
                            >
                                Ver Planes y Precios <Plus size={16} />
                            </button>
                            <button
                                onClick={() => setShowLimitModal(false)}
                                className="btn-secondary w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                            >
                                Volver
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
