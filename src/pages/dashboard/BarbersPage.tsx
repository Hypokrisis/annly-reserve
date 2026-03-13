import { useState } from 'react';
import { Plus, Edit2, Users as UsersIcon, ShieldAlert, UserMinus } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
                    <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-space-border">
                        <div className="w-14 h-14 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UsersIcon size={28} className="text-space-muted" />
                        </div>
                        <h3 className="text-lg font-bold text-space-text mb-2">Equipo vacío</h3>
                        <p className="text-space-muted text-sm mb-6 max-w-xs mx-auto">
                            Agrega tu primer barbero para empezar a recibir citas.
                        </p>
                        <button onClick={() => handleOpenModal()} className="btn-primary">
                            <Plus size={16} />Crear Barbero
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {barbers.map((barber) => (
                            <div key={barber.id}
                                className={`card p-5 transition-all duration-200 hover:shadow-card-lg group
                                    ${!barber.is_active ? 'opacity-60' : ''}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex gap-4 items-start flex-1">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold
                                            ${barber.is_active ? 'bg-space-primary-light text-space-primary' : 'bg-space-card2 text-space-muted'}`}
                                        >
                                            {barber.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <h3 className="font-bold text-space-text truncate">{barber.name}</h3>
                                                {!barber.is_active && (
                                                    <span className="badge-gray">Inactivo</span>
                                                )}
                                            </div>
                                            {barber.bio && <p className="text-space-muted text-sm truncate">{barber.bio}</p>}
                                            <div className="flex flex-wrap gap-3 mt-1">
                                                {barber.email && <span className="text-xs text-space-muted">{barber.email}</span>}
                                                {barber.phone && <span className="text-xs text-space-muted">{barber.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <button onClick={() => handleOpenModal(barber)}
                                            className="btn-ghost w-9 h-9 p-0 rounded-xl" title="Editar">
                                            <Edit2 size={15} />
                                        </button>
                                        {barber.is_active ? (
                                            <button onClick={() => handleDelete(barber)}
                                                className="w-9 h-9 p-0 rounded-xl text-space-muted hover:text-space-danger hover:bg-red-50 transition flex items-center justify-center"
                                                title="Desactivar">
                                                <UserMinus size={15} />
                                            </button>
                                        ) : (
                                            <button onClick={() => updateBarber(barber.id, { is_active: true })}
                                                className="px-3 h-9 rounded-xl text-xs font-semibold text-space-success bg-green-50 hover:bg-space-success hover:text-white transition">
                                                Activar
                                            </button>
                                        )}
                                        <button onClick={() => handleHardDelete(barber)}
                                            className="w-9 h-9 p-0 rounded-xl text-space-muted hover:text-space-danger hover:bg-red-50 transition flex items-center justify-center"
                                            title="Eliminar permanentemente">
                                            <ShieldAlert size={15} />
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
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                            <label className="input-label">Biografía</label>
                            <textarea value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="input-field" rows={3} placeholder="Información sobre el barbero" />
                        </div>

                        <div>
                            <label className="input-label">Servicios que ofrece <span className="text-space-danger">*</span></label>
                            {services.length === 0 ? (
                                <p className="text-sm text-space-muted">No hay servicios. Crea servicios primero.</p>
                            ) : (
                                <div className="space-y-1 max-h-44 overflow-y-auto border border-space-border rounded-xl p-3 bg-space-bg">
                                    {services.map((service) => (
                                        <label key={service.id}
                                            className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                                            <input type="checkbox"
                                                checked={selectedServices.includes(service.id)}
                                                onChange={() => toggleService(service.id)}
                                                className="w-4 h-4 text-space-primary rounded border-space-border focus:ring-space-primary" />
                                            <span className="text-sm text-space-text">{service.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {formErrors.services && <p className="mt-1 text-sm text-space-danger">{formErrors.services}</p>}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-space-border">
                            <button type="button" onClick={handleCloseModal} className="btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
