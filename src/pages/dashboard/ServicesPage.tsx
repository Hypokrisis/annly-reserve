import { useState } from 'react';
import { Plus, Edit2, Scissors, ShieldAlert, Ban } from 'lucide-react';
import { supabase } from '@/supabaseClient';
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
    const { services, loading, createService, updateService, deleteService, hardDeleteService } = useServices();
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
        if (!confirm(`¿Estás seguro de desactivar el servicio "${service.name}"? Ya no aparecerá en el flujo de reservas.`)) {
            return;
        }

        // We use deleteService which is likely a soft delete based on the current implementation
        // or just calls servicesService.deleteService.
        await deleteService(service.id);
    };

    const handleHardDelete = async (service: Service) => {
        // Check for active appointments
        const { data: activeApts } = await supabase
            .from('appointments')
            .select('id')
            .eq('service_id', service.id)
            .eq('status', 'confirmed')
            .limit(1);

        if (activeApts && activeApts.length > 0) {
            alert('No se puede eliminar permanentemente: hay citas CONFIRMADAS activas para este servicio. Cancela las citas primero o solo desactiva el servicio.');
            return;
        }

        if (!confirm(`⚠️ ALERTA: ¿Eliminar permanentemente "${service.name}"?\n\n- Se borrará de todos los barberos asociados.\n- Las citas históricas mostrarán "Servicio eliminado".\n- Esta acción NO se puede deshacer.`)) {
            return;
        }

        await hardDeleteService(service.id);
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Servicios</h1>
                        <p className="text-sm text-gray-500 mt-1">Define tu catálogo y precios</p>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto rounded-full px-8 h-12 shadow-lg shadow-black/5 hover:shadow-black/10 transition-all active:scale-95 flex items-center gap-2">
                        <Plus size={20} />
                        <span className="font-bold uppercase text-xs tracking-widest">Nuevo Servicio</span>
                    </Button>
                </div>

                {/* Services List */}
                {loading && services.length === 0 ? (
                    <LoadingSpinner />
                ) : services.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Scissors size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">
                            Catálogo vacío
                        </h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            Empieza agregando un servicio para que tus clientes puedan reservar.
                        </p>
                        <Button onClick={() => handleOpenModal()} className="rounded-full px-8 py-3">
                            <Plus size={20} className="mr-2" />
                            Crear Servicio
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 ${!service.is_active ? 'bg-gray-50/50' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 flex gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${!service.is_active ? 'bg-gray-200 text-gray-400' : 'bg-black text-white'}`}>
                                            <Scissors size={28} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="text-2xl font-black text-gray-900 truncate">
                                                    {service.name}
                                                </h3>
                                                {!service.is_active && (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] uppercase font-bold tracking-widest rounded-full">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            {service.description && (
                                                <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-2xl">{service.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-4 mt-4">
                                                <span className="flex items-center gap-2 text-sm font-bold text-gray-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                    ⏱️ {service.duration_minutes} MIN
                                                </span>
                                                <span className="flex items-center gap-2 text-sm font-black text-black">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleOpenModal(service)}
                                            className="rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </Button>

                                        {service.is_active ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleDelete(service)}
                                                className="rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm text-gray-600"
                                                title="Desactivar"
                                            >
                                                <Ban size={18} />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                onClick={() => updateService(service.id, { is_active: true })}
                                                className="rounded-full px-6 h-12 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm text-sm font-bold uppercase tracking-widest"
                                            >
                                                Activar
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleHardDelete(service)}
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
