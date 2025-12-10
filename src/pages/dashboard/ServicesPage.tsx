import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Scissors } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useServices } from '@/hooks/useServices';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils';
import type { Service } from '@/types';

export default function ServicesPage() {
    const { services, loading, createService, updateService, deleteService } = useServices();
    const { canManageServices } = usePermissions();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        duration_minutes: '',
        price: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleOpenModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                description: service.description || '',
                duration_minutes: service.duration_minutes.toString(),
                price: service.price.toString(),
            });
        } else {
            setEditingService(null);
            setFormData({
                name: '',
                description: '',
                duration_minutes: '',
                price: '',
            });
        }
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
        setFormData({ name: '', description: '', duration_minutes: '', price: '' });
        setFormErrors({});
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'El nombre es requerido';
        }

        const duration = parseInt(formData.duration_minutes);
        if (!formData.duration_minutes || isNaN(duration) || duration <= 0) {
            errors.duration_minutes = 'La duración debe ser mayor a 0';
        }

        const price = parseFloat(formData.price);
        if (!formData.price || isNaN(price) || price < 0) {
            errors.price = 'El precio debe ser mayor o igual a 0';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const serviceData = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            duration_minutes: parseInt(formData.duration_minutes),
            price: parseFloat(formData.price),
        };

        let success = false;

        if (editingService) {
            const result = await updateService(editingService.id, serviceData);
            success = result !== null;
        } else {
            const result = await createService(serviceData);
            success = result !== null;
        }

        if (success) {
            handleCloseModal();
        }
    };

    const handleDelete = async (service: Service) => {
        if (!confirm(`¿Estás seguro de eliminar el servicio "${service.name}"?`)) {
            return;
        }

        await deleteService(service.id);
    };

    if (!canManageServices) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-gray-600">No tienes permisos para gestionar servicios.</p>
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
                        <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
                        <p className="text-gray-600 mt-1">Gestiona los servicios que ofreces</p>
                    </div>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={20} className="mr-2" />
                        Nuevo Servicio
                    </Button>
                </div>

                {/* Services List */}
                {loading && services.length === 0 ? (
                    <LoadingSpinner />
                ) : services.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center">
                        <Scissors size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay servicios
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Comienza agregando tu primer servicio
                        </p>
                        <Button onClick={() => handleOpenModal()}>
                            <Plus size={20} className="mr-2" />
                            Crear Servicio
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {service.name}
                                        </h3>
                                        {service.description && (
                                            <p className="text-gray-600 mt-1">{service.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="text-sm text-gray-500">
                                                ⏱️ {service.duration_minutes} min
                                            </span>
                                            <span className="text-sm font-semibold text-indigo-600">
                                                {formatCurrency(service.price)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenModal(service)}
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(service)}
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
                    title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Nombre del Servicio"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={formErrors.name}
                            placeholder="Ej: Corte de pelo"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descripción
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                rows={3}
                                placeholder="Descripción opcional del servicio"
                            />
                        </div>

                        <Input
                            label="Duración (minutos)"
                            type="number"
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                            error={formErrors.duration_minutes}
                            placeholder="30"
                            min="1"
                            required
                        />

                        <Input
                            label="Precio"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            error={formErrors.price}
                            placeholder="500.00"
                            min="0"
                            required
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
