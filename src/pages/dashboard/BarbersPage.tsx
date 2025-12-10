import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users as UsersIcon } from 'lucide-react';
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
    const { barbers, loading, createBarber, updateBarber, deleteBarber, getBarberServices } = useBarbers();
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
        if (!confirm(`¿Estás seguro de desactivar a "${barber.name}"?`)) {
            return;
        }

        await deleteBarber(barber.id);
    };

    const toggleService = (serviceId: string) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Barberos</h1>
                        <p className="text-gray-600 mt-1">Gestiona tu equipo de trabajo</p>
                    </div>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={20} className="mr-2" />
                        Nuevo Barbero
                    </Button>
                </div>

                {/* Barbers List */}
                {loading && barbers.length === 0 ? (
                    <LoadingSpinner />
                ) : barbers.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center">
                        <UsersIcon size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay barberos
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Comienza agregando tu primer barbero
                        </p>
                        <Button onClick={() => handleOpenModal()}>
                            <Plus size={20} className="mr-2" />
                            Crear Barbero
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {barbers.map((barber) => (
                            <div
                                key={barber.id}
                                className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition ${!barber.is_active ? 'opacity-50' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {barber.name}
                                            </h3>
                                            {!barber.is_active && (
                                                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                                    Inactivo
                                                </span>
                                            )}
                                        </div>
                                        {barber.bio && (
                                            <p className="text-gray-600 mt-1">{barber.bio}</p>
                                        )}
                                        <div className="flex flex-col gap-1 mt-3">
                                            {barber.email && (
                                                <span className="text-sm text-gray-500">
                                                    📧 {barber.email}
                                                </span>
                                            )}
                                            {barber.phone && (
                                                <span className="text-sm text-gray-500">
                                                    📱 {barber.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenModal(barber)}
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(barber)}
                                        >
                                            <Trash2 size={16} className="text-red-600" />
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
