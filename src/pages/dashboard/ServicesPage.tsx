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
            setFormData({ name: '', description: '', duration_minutes: '', price: '' });
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
        if (!formData.name.trim()) errors.name = 'El nombre es requerido';
        const duration = parseInt(formData.duration_minutes);
        if (!formData.duration_minutes || isNaN(duration) || duration <= 0)
            errors.duration_minutes = 'La duración debe ser mayor a 0';
        const price = parseFloat(formData.price);
        if (!formData.price || isNaN(price) || price < 0)
            errors.price = 'El precio debe ser mayor o igual a 0';
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
        if (success) handleCloseModal();
    };

    const handleDelete = async (service: Service) => {
        if (!confirm(`¿Estás seguro de desactivar el servicio "${service.name}"?`)) return;
        await deleteService(service.id);
    };

    const handleHardDelete = async (service: Service) => {
        const { data: activeApts } = await supabase
            .from('appointments')
            .select('id')
            .eq('service_id', service.id)
            .eq('status', 'confirmed')
            .limit(1);
        if (activeApts && activeApts.length > 0) {
            alert('No se puede eliminar: hay citas confirmadas activas.');
            return;
        }
        if (!confirm(`⚠️ ¿Eliminar permanentemente "${service.name}"? Esta acción NO se puede deshacer.`)) return;
        await hardDeleteService(service.id);
    };

    if (!canManageServices) {
        return (
            <DashboardLayout>
                <div className="py-12 text-center">
                    <p className="text-[#95ab8a]">No tienes permisos para gestionar servicios.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-[#f0f4ee]">Servicios</h1>
                        <p className="mt-0.5 text-xs text-[#95ab8a]">Define tu catálogo y precios</p>
                    </div>
                    <button onClick={() => handleOpenModal()}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#9bc287] px-5 py-2.5 text-sm font-extrabold text-[#22321c] transition hover:bg-[#86ad72] sm:w-auto">
                        <Plus size={16} /> Nuevo servicio
                    </button>
                </div>

                {loading && services.length === 0 ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : services.length === 0 ? (
                    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-[#243529] bg-[#131c17] p-10 text-center sm:p-16">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d2a23]">
                            <Scissors size={28} className="text-[#95ab8a]" />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-[#f0f4ee]">Catálogo vacío</h3>
                        <p className="mb-6 max-w-xs text-sm text-[#95ab8a]">
                            Agrega tu primer servicio para empezar a recibir reservas.
                        </p>
                        <button onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 rounded-full bg-[#9bc287] px-5 py-2.5 text-sm font-extrabold text-[#22321c] transition hover:bg-[#86ad72]">
                            <Plus size={16} /> Crear servicio
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {services.map((service) => (
                            <div key={service.id}
                                className={`rounded-[20px] border border-[#243529] bg-[#131c17] p-5 transition hover:border-[#9bc287]/30 ${!service.is_active ? 'opacity-60' : ''}`}>
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${service.is_active ? 'bg-[#9bc287]/10 text-[#9bc287]' : 'bg-[#1d2a23] text-[#95ab8a]'}`}>
                                            <Scissors size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-bold text-[#f0f4ee] sm:text-base">{service.name}</h3>
                                                {!service.is_active && (
                                                    <span className="rounded-full bg-[#95ab8a]/10 px-2 py-0.5 text-[9px] font-bold uppercase text-[#95ab8a]">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            {service.description && (
                                                <p className="mb-1.5 line-clamp-1 text-xs text-[#95ab8a]">{service.description}</p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1 rounded-md bg-[#243529]/50 px-2 py-0.5 text-xs text-[#95ab8a]">
                                                    <Clock size={11} /> {service.duration_minutes} min
                                                </span>
                                                <span className="text-sm font-extrabold text-[#9bc287]">
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                                        <button onClick={() => handleOpenModal(service)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#243529] text-[#95ab8a] transition hover:border-[#9bc287]/40 hover:text-[#9bc287]">
                                            <Edit2 size={16} />
                                        </button>
                                        {service.is_active ? (
                                            <button onClick={() => handleDelete(service)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#243529] text-[#95ab8a] transition hover:border-[#ef4444]/40 hover:bg-[#ef4444]/10 hover:text-[#ef4444]">
                                                <Ban size={16} />
                                            </button>
                                        ) : (
                                            <button onClick={() => updateService(service.id, { is_active: true })}
                                                className="h-9 rounded-xl border border-[#22c55e]/20 bg-[#1d2a23] px-3 text-xs font-extrabold text-[#22c55e] transition hover:bg-[#22c55e] hover:text-white">
                                                Activar
                                            </button>
                                        )}
                                        <button onClick={() => handleHardDelete(service)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ef4444]/20 text-[#ef4444] transition hover:bg-[#ef4444] hover:text-white">
                                            <ShieldAlert size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Modal isOpen={isModalOpen} onClose={handleCloseModal}
                    title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'} size="lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <Input label="Nombre del Servicio" value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={formErrors.name} placeholder="Ej: Corte de pelo + Lavado" required />
                            <div>
                                <label className="mb-1.5 ml-2 block text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#95ab8a]">Descripción</label>
                                <textarea value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="min-h-[100px] w-full resize-none rounded-2xl border border-[#243529] bg-[#1d2a23] px-5 py-3 text-sm text-[#f0f4ee] outline-none placeholder-[#95ab8a]/40 transition-all focus:border-[#9bc287] focus:ring-2 focus:ring-[#9bc287]/10"
                                    placeholder="Describe brevemente qué incluye este servicio..." />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Input label="Duración (minutos)" type="number" value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                    error={formErrors.duration_minutes} placeholder="30" min="1" required />
                                <Input label="Precio ($)" type="number" step="0.01" value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    error={formErrors.price} placeholder="0.00" min="0" required />
                            </div>
                        </div>

                        <div className="flex flex-col justify-end gap-3 border-t border-[#243529] pt-4 sm:flex-row">
                            <button type="button" onClick={handleCloseModal}
                                className="h-12 w-full rounded-full border border-[#243529] text-sm font-bold text-[#95ab8a] transition hover:border-[#9bc287] hover:text-[#9bc287] sm:w-auto sm:px-6">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading}
                                className="h-12 w-full rounded-full bg-[#9bc287] text-sm font-extrabold text-[#22321c] transition hover:bg-[#86ad72] disabled:opacity-50 sm:w-auto sm:px-6">
                                {loading ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear servicio'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}