import { useState } from 'react';
import { Plus, Edit2, Scissors, ShieldAlert, Ban, Clock } from 'lucide-react';
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
                    <p className="text-space-muted">No tienes permisos para gestionar servicios.</p>
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
                        <h1 className="text-3xl font-bold text-white tracking-tight">Servicios</h1>
                        <p className="text-sm text-space-muted mt-1">Define tu catálogo y precios</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto rounded-xl px-6 h-12 shadow-lg shadow-space-primary/20 hover:shadow-space-primary/30 transition-all active:scale-95 flex items-center gap-2 bg-gradient-to-r from-space-primary to-space-purple border-none"
                    >
                        <Plus size={18} />
                        <span className="font-bold text-sm tracking-wide">Nuevo Servicio</span>
                    </Button>
                </div>

                {/* Services List */}
                {loading && services.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : services.length === 0 ? (
                    <div className="bg-space-card rounded-3xl p-16 text-center border border-dashed border-space-border shadow-sm">
                        <div className="w-20 h-20 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Scissors size={32} className="text-space-muted" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Catálogo vacío
                        </h3>
                        <p className="text-space-muted mb-8 max-w-sm mx-auto">
                            Empieza agregando un servicio para que tus clientes puedan reservar.
                        </p>
                        <Button onClick={() => handleOpenModal()} className="rounded-xl px-8 py-3 bg-space-card2 border border-space-border hover:bg-space-primary hover:text-white hover:border-transparent transition-all">
                            <Plus size={20} className="mr-2" />
                            Crear Servicio
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className={`bg-space-card rounded-2xl p-6 shadow-lg border border-space-border hover:border-space-primary/50 transition-all duration-300 group ${!service.is_active ? 'opacity-60 saturate-0 hover:opacity-100 hover:saturate-50' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 flex gap-5 items-start">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${!service.is_active ? 'bg-space-card2 text-space-muted' : 'bg-gradient-to-br from-space-primary to-space-purple text-white'}`}>
                                            <Scissors size={24} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                                <h3 className="text-xl font-bold text-white truncate">
                                                    {service.name}
                                                </h3>
                                                {!service.is_active && (
                                                    <span className="px-2 py-0.5 bg-space-card2 text-space-muted border border-space-border text-[10px] uppercase font-bold tracking-widest rounded-full">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            {service.description && (
                                                <p className="text-space-muted text-sm leading-relaxed max-w-2xl">{service.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-4 mt-3">
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-space-muted bg-space-card2 px-2 py-1 rounded-lg border border-space-border">
                                                    <Clock size={12} className="text-space-primary" />
                                                    {service.duration_minutes} MIN
                                                </span>
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-space-card2 px-2 py-1 rounded-lg border border-space-border">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-space-success"></span>
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleOpenModal(service)}
                                            className="rounded-lg w-10 h-10 p-0 flex items-center justify-center bg-space-card2 hover:bg-space-primary hover:text-white border-transparent text-space-muted transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </Button>

                                        {service.is_active ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleDelete(service)}
                                                className="rounded-lg w-10 h-10 p-0 flex items-center justify-center bg-space-card2 hover:bg-space-danger/20 hover:text-space-danger border-transparent text-space-muted transition-colors"
                                                title="Desactivar"
                                            >
                                                <Ban size={16} />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                onClick={() => updateService(service.id, { is_active: true })}
                                                className="rounded-lg px-4 h-10 flex items-center justify-center bg-space-card2 hover:bg-space-success/20 hover:text-space-success border-transparent text-space-muted transition-all text-xs font-bold uppercase tracking-widest"
                                            >
                                                Activar
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleHardDelete(service)}
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
                    title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                >
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div className="space-y-4">
                            <Input
                                label="Nombre del Servicio"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={formErrors.name}
                                placeholder="Ej: Corte de pelo"
                                required
                                className="bg-space-bg border-space-border text-space-text"
                            />

                            <div>
                                <label className="block text-sm font-medium text-space-muted mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-primary focus:border-transparent transition outline-none"
                                    rows={3}
                                    placeholder="Descripción opcional del servicio"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Duración (min)"
                                    type="number"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                    error={formErrors.duration_minutes}
                                    placeholder="30"
                                    min="1"
                                    required
                                    className="bg-space-bg border-space-border text-space-text"
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
                                    className="bg-space-bg border-space-border text-space-text"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-space-border">
                            <Button type="button" variant="secondary" onClick={handleCloseModal} className="bg-space-card2 hover:bg-space-bg text-space-text border-transparent">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-space-primary to-space-purple border-none shadow-lg shadow-space-primary/20 hover:opacity-90">
                                {loading ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
