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
        setFormData({ name: '', email: '', phone: '', bio: '' });
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
                    <p className="text-gray-600">No tienes permisos para gestionar barberos.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Barberos</h1>
                        <p className="text-sm text-gray-500 mt-1">Coordina tu equipo y disponibilidad</p>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto rounded-full px-8 h-12 shadow-lg shadow-black/5 hover:shadow-black/10 transition-all active:scale-95 flex items-center gap-2">
                        <Plus size={20} />
                        <span className="font-bold uppercase text-xs tracking-widest">Añadir Barbero</span>
                    </Button>
                </div>

                {/* Barbers List */}
                {loading && barbers.length === 0 ? (
                    <LoadingSpinner />
                ) : barbers.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UsersIcon size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">
                            Equipo vacío
                        </h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            Comienza agregando a tu primer barbero para empezar a recibir citas.
                        </p>
                        <Button onClick={() => handleOpenModal()} className="rounded-full px-8 py-3">
                            <Plus size={20} className="mr-2" />
                            Crear Barbero
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {barbers.map((barber) => (
                            <div
                                key={barber.id}
                                className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 ${!barber.is_active ? 'bg-gray-50/50' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 flex gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${!barber.is_active ? 'bg-gray-200 text-gray-400' : 'bg-black text-white'}`}>
                                            <UsersIcon size={28} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="text-2xl font-black text-gray-900 truncate">
                                                    {barber.name}
                                                </h3>
                                                {!barber.is_active && (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] uppercase font-bold tracking-widest rounded-full">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            {barber.bio && (
                                                <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-2xl">{barber.bio}</p>
                                            )}
                                            <div className="flex flex-wrap gap-4 mt-4">
                                                {barber.email && (
                                                    <span className="flex items-center gap-2 text-sm font-medium text-gray-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                        {barber.email}
                                                    </span>
                                                )}
                                                {barber.phone && (
                                                    <span className="flex items-center gap-2 text-sm font-medium text-gray-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                        {barber.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleOpenModal(barber)}
                                            className="rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </Button>

                                        {barber.is_active ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleDelete(barber)}
                                                className="rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm text-gray-600"
                                                title="Desactivar"
                                            >
                                                <UserMinus size={18} />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                onClick={() => updateBarber(barber.id, { is_active: true })}
                                                className="rounded-full px-6 h-12 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm text-sm font-bold uppercase tracking-widest"
                                            >
                                                Activar
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleHardDelete(barber)}
                                            className="rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                            title="Eliminar Permanentemente"
                                        >
                                            <ShieldAlert size={18} />
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
                        />

                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="juan@ejemplo.com"
                        />

                        <Input
                            label="Teléfono"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(809) 555-5555"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biografía
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                rows={3}
                                placeholder="Información sobre el barbero"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Servicios que ofrece <span className="text-red-500">*</span>
                            </label>
                            {services.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No hay servicios disponibles. Crea servicios primero.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                    {services.map((service) => (
                                        <label
                                            key={service.id}
                                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedServices.includes(service.id)}
                                                onChange={() => toggleService(service.id)}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-900">{service.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {formErrors.services && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.services}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
