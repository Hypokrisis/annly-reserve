import { useState, useEffect } from 'react';
import { Plus, Edit2, Users as UsersIcon, ShieldAlert, UserMinus, TrendingUp, Award, Calendar } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { usePermissions } from '@/hooks/usePermissions';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/contexts/ToastContext';
import type { Barber } from '@/types';

export default function BarbersPage() {
    const { barbers, loading, createBarber, updateBarber, deleteBarber, hardDeleteBarber, getBarberServices } = useBarbers();
    const { services } = useServices();
    const { canManageBarbers } = usePermissions();
    const { business } = useBusiness();
    const toast = useToast();

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
    });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleOpenModal = async (barber?: Barber) => {
        if (barber) {
            setEditingBarber(barber);
            setFormData({
                name: barber.name,
                user_id: barber.user_id || '',
                email: barber.email || '',
                phone: barber.phone || '',
                bio: barber.bio || '',
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
            });
            setSelectedServices([]);
        }
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBarber(null);
        setFormData({ name: '', user_id: '', email: '', phone: '', bio: '' });
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
            <div className="animate-fade-up">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="page-title">Equipo</h1>
                        <p className="page-subtitle">Coordina tu equipo y disponibilidad</p>
                    </div>
                    <button onClick={() => handleOpenModal()}
                        className="btn-primary w-full sm:w-auto">
                        <Plus size={16} />
                        Añadir Barbero
                    </button>
                </div>

                {/* Barbers List */}
                {loading && barbers.length === 0 ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : barbers.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-space-border animate-fade-up">
                        <div className="w-14 h-14 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UsersIcon size={28} className="text-space-muted" />
                        </div>
                        <h3 className="text-lg font-bold text-space-text mb-2">Equipo vacío</h3>
                        <p className="text-space-muted text-sm mb-6 max-w-xs mx-auto">
                            Agrega tu primer barbero para empezar a recibir citas.
                        </p>
                        <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto">
                            <Plus size={16} />Crear Barbero
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {barbers.map((barber) => (
                            <div key={barber.id}
                                className={`card p-4 sm:p-5 transition-all duration-300 hover:shadow-card-lg group relative overflow-hidden
                                    ${!barber.is_active ? 'opacity-60' : ''}`}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-4 items-start flex-1 min-w-0">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-lg font-black shadow-sm
                                            ${barber.is_active ? 'bg-space-primary-light text-space-primary' : 'bg-space-card2 text-space-muted'}`}
                                        >
                                            {barber.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <h3 className="font-bold text-space-text truncate group-hover:text-space-primary transition-colors text-sm sm:text-base">{barber.name}</h3>
                                                {!barber.is_active && (
                                                    <span className="badge-gray scale-90 origin-left">Inactivo</span>
                                                )}
                                            </div>
                                            {barber.bio && <p className="text-space-muted text-xs line-clamp-1 mb-1.5">{barber.bio}</p>}
                                            <div className="flex flex-col gap-1">
                                                {barber.email && (
                                                    <span className="text-[10px] text-space-muted overflow-hidden text-ellipsis">{barber.email}</span>
                                                )}
                                                {barber.phone && (
                                                    <span className="text-[10px] text-space-muted font-bold tracking-wider">{barber.phone}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Analytics Strip ── */}
                                    {barberStats[barber.id] && (
                                        <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-space-border/20 my-1">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest">Total</p>
                                                <p className="text-lg font-black text-space-text">{barberStats[barber.id].total}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest">Este Mes</p>
                                                <p className="text-lg font-black text-space-primary">{barberStats[barber.id].thisMonth}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest">Esta Semana</p>
                                                <p className="text-lg font-black text-emerald-600">{barberStats[barber.id].thisWeek}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-space-border/20">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => handleOpenModal(barber)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-50 text-space-muted hover:text-white hover:bg-space-primary transition-all border border-transparent shadow-sm" title="Editar">
                                                <Edit2 size={14} />
                                            </button>
                                            {barber.is_active ? (
                                                <button onClick={() => handleDelete(barber)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-50 text-space-muted hover:text-white hover:bg-space-danger transition-all border border-transparent shadow-sm"
                                                    title="Desactivar">
                                                    <UserMinus size={14} />
                                                </button>
                                            ) : (
                                                <button onClick={() => updateBarber(barber.id, { is_active: true })}
                                                    className="px-3 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-space-success bg-white border border-space-success/20 hover:bg-space-success hover:text-white transition-all shadow-sm">
                                                    Activar
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => handleHardDelete(barber)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-space-danger hover:bg-space-danger hover:text-white transition-all border border-red-100 shadow-sm"
                                            title="Eliminar permanentemente">
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
                    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-3 scrollbar-custom">
                        <div className="space-y-4">
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
                                    className="w-full px-5 py-3 bg-neutral-50 border border-space-border/20 rounded-2xl text-sm font-medium text-space-text focus:bg-white focus:ring-4 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-neutral-300 resize-none min-h-[80px]" placeholder="Información sobre el barbero" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 mb-1.5 block">Servicios que ofrece <span className="text-space-danger">*</span></label>
                                {services.length === 0 ? (
                                    <p className="text-sm text-space-muted italic p-4 bg-neutral-50 rounded-xl border border-dashed border-space-border">No hay servicios creados aún. Ve a la página de Servicios primero.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-space-border/30 rounded-2xl p-3 bg-neutral-50/50">
                                        {services.map((service) => (
                                            <label key={service.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedServices.includes(service.id) ? 'bg-white border-space-primary shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
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

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-neutral-100 sticky bottom-0 bg-white z-10 pb-2">
                            <button type="button" onClick={handleCloseModal} className="btn-secondary w-full sm:w-auto h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-space-primary/15">
                                {loading ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
