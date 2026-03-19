import { useState } from 'react';
import { Plus, Edit2, Scissors, ShieldAlert, Ban, Clock } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
            <div className="animate-fade-up">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="page-title">Servicios</h1>
                        <p className="page-subtitle">Define tu catálogo y precios</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto">
                        <Plus size={16} />Nuevo Servicio
                    </button>
                </div>

                {/* Services List */}
                {loading && services.length === 0 ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : services.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 sm:p-16 text-center border-2 border-dashed border-space-border">
                        <div className="w-14 h-14 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Scissors size={28} className="text-space-muted" />
                        </div>
                        <h3 className="text-lg font-bold text-space-text mb-2">Catálogo vacío</h3>
                        <p className="text-space-muted text-sm mb-6 max-w-xs mx-auto">
                            Agrega tu primer servicio para empezar a recibir reservas.
                        </p>
                        <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto">
                            <Plus size={16} />Crear Servicio
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {services.map((service) => (
                            <div key={service.id}
                                className={`card p-4 sm:p-5 hover:shadow-card-lg transition-all group overflow-hidden ${!service.is_active ? 'opacity-60' : ''}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex gap-3 sm:gap-4 items-start flex-1 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0
                                            ${service.is_active ? 'bg-space-primary-light text-space-primary' : 'bg-space-card2 text-space-muted'}`}>
                                            <Scissors size={18} className="sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <h3 className="font-bold text-space-text truncate text-sm sm:text-base">{service.name}</h3>
                                                {!service.is_active && <span className="badge-gray scale-90 origin-left">Inactivo</span>}
                                            </div>
                                            {service.description && (
                                                <p className="text-space-muted text-xs sm:text-sm line-clamp-1 mb-1.5">{service.description}</p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-space-muted bg-neutral-100 px-2 py-0.5 rounded-md">
                                                    <Clock size={11} />{service.duration_minutes} min
                                                </span>
                                                <span className="text-xs sm:text-sm font-black text-space-primary uppercase tracking-tight">
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 bg-neutral-50/50 sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none justify-between sm:justify-end">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => handleOpenModal(service)}
                                                className="w-10 h-10 sm:w-9 sm:h-9 bg-white sm:bg-transparent border border-neutral-100 sm:border-none shadow-sm sm:shadow-none flex items-center justify-center rounded-xl text-space-muted hover:text-space-primary hover:bg-space-card2 transition-all" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            {service.is_active ? (
                                                <button onClick={() => handleDelete(service)}
                                                    className="w-10 h-10 sm:w-9 sm:h-9 bg-white sm:bg-transparent border border-neutral-100 sm:border-none shadow-sm sm:shadow-none flex items-center justify-center rounded-xl text-space-muted hover:text-space-danger hover:bg-red-50 transition-all font-bold"
                                                    title="Desactivar">
                                                    <Ban size={16} />
                                                </button>
                                            ) : (
                                                <button onClick={() => updateService(service.id, { is_active: true })}
                                                    className="px-4 h-10 sm:h-9 rounded-xl text-xs font-black uppercase tracking-widest text-space-success bg-white border border-space-success/20 hover:bg-space-success hover:text-white transition-all">
                                                    Activar
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => handleHardDelete(service)}
                                            className="w-10 h-10 sm:w-9 sm:h-9 bg-red-50 sm:bg-transparent border border-red-100 sm:border-none shadow-sm sm:shadow-none flex items-center justify-center rounded-xl text-space-danger hover:bg-space-danger hover:text-white transition-all"
                                            title="Eliminar permanentemente">
                                            <ShieldAlert size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <Modal isOpen={isModalOpen} onClose={handleCloseModal}
                    title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'} size="lg">
                    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-3 scrollbar-custom">
                        <div className="space-y-4">
                            <Input label="Nombre del Servicio" value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={formErrors.name} placeholder="Ej: Corte de pelo + Lavado" required />

                            <div>
                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 mb-1.5 block">Descripción</label>
                                <textarea value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-5 py-3 bg-neutral-50 border border-space-border/20 rounded-2xl text-sm font-medium text-space-text focus:bg-white focus:ring-4 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-neutral-300 resize-none min-h-[100px]" placeholder="Describe brevemente qué incluye este servicio..." />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label="Duración (minutos)" type="number" value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                    error={formErrors.duration_minutes} placeholder="30" min="1" required />
                                <Input label="Precio ($)" type="number" step="0.01" value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    error={formErrors.price} placeholder="0.00" min="0" required />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-neutral-100 sticky bottom-0 bg-white z-10 pb-2">
                            <button type="button" onClick={handleCloseModal} className="btn-secondary w-full sm:w-auto h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-space-primary/15">
                                {loading ? 'Guardando...' : editingService ? 'Actualizar Servicio' : 'Crear Servicio'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
