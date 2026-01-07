import { useState } from 'react';
import { Plus, Edit2, Users as UsersIcon, ShieldAlert, UserMinus } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { usePermissions } from '@/hooks/usePermissions';
import type { Barber } from '@/types';

export default function BarbersPage() {
    const { barbers, loading, createBarber, updateBarber, deleteBarber, hardDeleteBarber, getBarberServices } = useBarbers();
    const { services } = useServices();
    const { canManageBarbers } = usePermissions();

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
        if (!confirm(`¿Estás seguro de desactivar a "${barber.name}"? El barbero dejará de estar disponible para reservas.`)) {
            return;
        }

        await deleteBarber(barber.id);
    };

    const handleHardDelete = async (barber: Barber) => {
        // Check for active appointments
        const { data: activeApts } = await supabase
            .from('appointments')
            .select('id')
            .eq('barber_id', barber.id)
            .eq('status', 'confirmed')
            .limit(1);

        if (activeApts && activeApts.length > 0) {
            alert('No se puede eliminar permanentemente: este barbero tiene citas CONFIRMADAS activas. Cancela las citas primero o solo desactiva al barbero.');
            return;
        }

        if (!confirm(`⚠️ ALERTA DE SEGURIDAD\n\n¿Estás ABSOLUTAMENTE seguro de eliminar permanentemente a "${barber.name}"?\n\n- Se borrará su perfil y asociaciones.\n- Las citas históricas mostrarán "Barbero eliminado".\n- Esta acción NO se puede deshacer.`)) {
            return;
        }

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
            <div className="animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Barberos</h1>
                        <p className="text-sm text-space-muted mt-1">Coordina tu equipo y disponibilidad</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto rounded-xl px-6 h-12 shadow-lg shadow-space-purple/20 hover:shadow-space-purple/30 transition-all active:scale-95 flex items-center gap-2 bg-gradient-to-r from-space-purple to-space-pink border-none"
                    >
                        <Plus size={18} />
                        <span className="font-bold text-sm tracking-wide">Añadir Barbero</span>
                    </Button>
                </div>

                {/* Barbers List */}
                {loading && barbers.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : barbers.length === 0 ? (
                    <div className="bg-space-card rounded-3xl p-16 text-center border border-dashed border-space-border shadow-sm">
                        <div className="w-20 h-20 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UsersIcon size={32} className="text-space-muted" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Equipo vacío
                        </h3>
                        <p className="text-space-muted mb-8 max-w-sm mx-auto">
                            Comienza agregando a tu primer barbero para empezar a recibir citas.
                        </p>
                        <Button onClick={() => handleOpenModal()} className="rounded-xl px-8 py-3 bg-space-card2 border border-space-border hover:bg-space-purple hover:text-white hover:border-transparent transition-all">
                            <Plus size={20} className="mr-2" />
                            Crear Barbero
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {barbers.map((barber) => (
                            <div
                                key={barber.id}
                                className={`bg-space-card rounded-2xl p-6 shadow-lg border border-space-border hover:border-space-purple/50 transition-all duration-300 group ${!barber.is_active ? 'opacity-60 saturate-0 hover:opacity-100 hover:saturate-50' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 flex gap-5 items-start">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${!barber.is_active ? 'bg-space-card2 text-space-muted' : 'bg-gradient-to-br from-space-purple to-space-pink text-white'}`}>
                                            <UsersIcon size={24} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                                <h3 className="text-xl font-bold text-white truncate">
                                                    {barber.name}
                                                </h3>
                                                {!barber.is_active && (
                                                    <span className="px-2 py-0.5 bg-space-card2 text-space-muted border border-space-border text-[10px] uppercase font-bold tracking-widest rounded-full">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            {barber.bio && (
                                                <p className="text-space-muted text-sm leading-relaxed max-w-2xl">{barber.bio}</p>
                                            )}
                                            <div className="flex flex-wrap gap-4 mt-3">
                                                {barber.email && (
                                                    <span className="flex items-center gap-2 text-xs font-medium text-space-muted">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-space-primary"></span>
                                                        {barber.email}
                                                    </span>
                                                )}
                                                {barber.phone && (
                                                    <span className="flex items-center gap-2 text-xs font-medium text-space-muted">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-space-primary"></span>
                                                        {barber.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleOpenModal(barber)}
                                            className="rounded-lg w-10 h-10 p-0 flex items-center justify-center bg-space-card2 hover:bg-space-primary hover:text-white border-transparent text-space-muted transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </Button>

                                        {barber.is_active ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleDelete(barber)}
                                                className="rounded-lg w-10 h-10 p-0 flex items-center justify-center bg-space-card2 hover:bg-space-danger/20 hover:text-space-danger border-transparent text-space-muted transition-colors"
                                                title="Desactivar"
                                            >
                                                <UserMinus size={16} />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                onClick={() => updateBarber(barber.id, { is_active: true })}
                                                className="rounded-lg px-4 h-10 flex items-center justify-center bg-space-card2 hover:bg-space-success/20 hover:text-space-success border-transparent text-space-muted transition-all text-xs font-bold uppercase tracking-widest"
                                            >
                                                Activar
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleHardDelete(barber)}
                                            className="rounded-lg w-10 h-10 p-0 flex items-center justify-center hover:bg-space-danger/10 text-space-muted hover:text-space-danger transition-colors"
                                            title="Eliminar Permanentemente"
                                        >
                                            <ShieldAlert size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={editingBarber ? 'Editar Barbero' : 'Nuevo Barbero'}
                    size="lg"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Nombre"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={formErrors.name}
                            placeholder="Ej: Juan Pérez"
                            required
                            className="bg-space-bg border-space-border text-space-text"
                        />

                        <Input
                            label="ID de Usuario vinculado (opcional)"
                            value={formData.user_id}
                            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                            placeholder="UUID del usuario para acceso al dashboard"
                            className="bg-space-bg border-space-border text-space-text"
                        />

                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="juan@ejemplo.com"
                            className="bg-space-bg border-space-border text-space-text"
                        />

                        <Input
                            label="Teléfono"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(809) 555-5555"
                            className="bg-space-bg border-space-border text-space-text"
                        />

                        <div>
                            <label className="block text-sm font-medium text-space-muted mb-2">
                                Biografía
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-purple focus:border-transparent transition outline-none"
                                rows={3}
                                placeholder="Información sobre el barbero"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-space-muted mb-2">
                                Servicios que ofrece <span className="text-space-danger">*</span>
                            </label>
                            {services.length === 0 ? (
                                <p className="text-sm text-space-muted">
                                    No hay servicios disponibles. Crea servicios primero.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-space-border rounded-xl p-3 bg-space-bg">
                                    {services.map((service) => (
                                        <label
                                            key={service.id}
                                            className="flex items-center gap-3 p-2 hover:bg-space-card2 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedServices.includes(service.id)}
                                                onChange={() => toggleService(service.id)}
                                                className="w-4 h-4 text-space-purple rounded bg-space-card border-space-border focus:ring-space-purple"
                                            />
                                            <span className="text-sm text-space-text">{service.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {formErrors.services && (
                                <p className="mt-1 text-sm text-space-danger">{formErrors.services}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-space-border">
                            <Button type="button" variant="secondary" onClick={handleCloseModal} className="bg-space-card2 hover:bg-space-bg text-space-text border-transparent">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-space-purple to-space-pink border-none shadow-lg shadow-space-purple/20 hover:opacity-90">
                                {loading ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
