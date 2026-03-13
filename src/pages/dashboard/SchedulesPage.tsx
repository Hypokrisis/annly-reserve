import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBarbers } from '@/hooks/useBarbers';
import { useSchedule } from '@/hooks/useSchedule';
import { usePermissions } from '@/hooks/usePermissions';
import { getDayName } from '@/utils';
import type { Barber } from '@/types';
import { Calendar, Clock, Copy, ChevronDown, Check } from 'lucide-react';

interface DaySchedule {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
}

export default function SchedulesPage() {
    const { barbers } = useBarbers();
    const { canEditAllSchedules } = usePermissions();
    const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
    const { schedules, loading, updateSchedules } = useSchedule(selectedBarber?.id || null);

    const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize week schedule
    useEffect(() => {
        const initialSchedule: DaySchedule[] = [];

        for (let day = 0; day < 7; day++) {
            const existingSchedule = schedules.find(s => s.day_of_week === day);

            if (existingSchedule) {
                initialSchedule.push({
                    dayOfWeek: day,
                    startTime: existingSchedule.start_time,
                    endTime: existingSchedule.end_time,
                    isActive: existingSchedule.is_active,
                });
            } else {
                initialSchedule.push({
                    dayOfWeek: day,
                    startTime: '09:00',
                    endTime: '18:00',
                    isActive: false,
                });
            }
        }

        setWeekSchedule(initialSchedule);
        setHasChanges(false);
    }, [schedules]);

    const handleToggleDay = (dayOfWeek: number) => {
        setWeekSchedule(prev =>
            prev.map(day =>
                day.dayOfWeek === dayOfWeek
                    ? { ...day, isActive: !day.isActive }
                    : day
            )
        );
        setHasChanges(true);
    };

    const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
        setWeekSchedule(prev =>
            prev.map(day =>
                day.dayOfWeek === dayOfWeek
                    ? { ...day, [field]: value }
                    : day
            )
        );
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!selectedBarber) return;

        const success = await updateSchedules(weekSchedule);

        if (success) {
            setHasChanges(false);
            alert('Horarios guardados exitosamente');
        } else {
            alert('Error al guardar horarios');
        }
    };

    const handleCopyToAll = (dayOfWeek: number) => {
        const sourceDay = weekSchedule.find(d => d.dayOfWeek === dayOfWeek);
        if (!sourceDay) return;

        if (!confirm(`¿Copiar el horario de ${getDayName(dayOfWeek)} a todos los días?`)) {
            return;
        }

        setWeekSchedule(prev =>
            prev.map(day => ({
                ...day,
                startTime: sourceDay.startTime,
                endTime: sourceDay.endTime,
                isActive: sourceDay.isActive,
            }))
        );
        setHasChanges(true);
    };

    if (!canEditAllSchedules) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-space-muted">No tienes permisos para gestionar horarios.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl animate-fade-up">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="page-title">Horarios</h1>
                    <p className="page-subtitle">Configura los horarios de trabajo de tu equipo</p>
                </div>

                {/* Barber Selector */}
                <div className="card p-5 mb-6">
                    <label className="input-label">Selecciona un barbero</label>
                    <div className="relative">
                        <select
                            value={selectedBarber?.id || ''}
                            onChange={(e) => {
                                const barber = barbers.find(b => b.id === e.target.value);
                                setSelectedBarber(barber || null);
                            }}
                            className="input-field appearance-none cursor-pointer"
                        >
                            <option value="">-- Selecciona un barbero --</option>
                            {barbers.filter(b => b.is_active).map((barber) => (
                                <option key={barber.id} value={barber.id}>{barber.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-space-muted pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Schedule Editor */}
                {selectedBarber ? (
                    loading ? (
                        <div className="flex justify-center py-12"><LoadingSpinner /></div>
                    ) : (
                        <div className="space-y-3">
                            {weekSchedule.map((day) => (
                                <div key={day.dayOfWeek}
                                    className={`card p-5 transition-all ${day.isActive ? 'border-space-primary/30' : 'opacity-70'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2.5 cursor-pointer">
                                                <div onClick={() => handleToggleDay(day.dayOfWeek)}
                                                    className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors cursor-pointer
                                                        ${day.isActive ? 'bg-space-primary border-space-primary' : 'border-gray-300'}`}>
                                                    {day.isActive && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className={`font-semibold transition-colors ${day.isActive ? 'text-space-text' : 'text-space-muted'}`}>
                                                    {getDayName(day.dayOfWeek)}
                                                </span>
                                            </label>
                                            {!day.isActive && (
                                                <span className="badge-gray">Cerrado</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleCopyToAll(day.dayOfWeek)}
                                            disabled={!day.isActive}
                                            className={`text-xs flex items-center gap-1.5 transition
                                                ${day.isActive ? 'text-space-primary hover:text-space-primary-dark' : 'text-space-muted opacity-40 cursor-not-allowed'}`}>
                                            <Copy size={12} /> Copiar a todos
                                        </button>
                                    </div>

                                    {day.isActive && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="input-label flex items-center gap-1.5">
                                                    <Clock size={11} /> Inicio
                                                </label>
                                                <input type="time" value={day.startTime}
                                                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                                                    className="input-field" />
                                            </div>
                                            <div>
                                                <label className="input-label flex items-center gap-1.5">
                                                    <Clock size={11} /> Cierre
                                                </label>
                                                <input type="time" value={day.endTime}
                                                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                                                    className="input-field" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Save Button */}
                            <div className="flex justify-end pt-4">
                                <button onClick={handleSave} disabled={!hasChanges || loading}
                                    className={`btn-primary ${!hasChanges || loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {loading ? 'Guardando...' : 'Guardar Horarios'}
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-space-border">
                        <div className="w-14 h-14 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={28} className="text-space-muted" />
                        </div>
                        <p className="text-space-muted text-sm">
                            Selecciona un barbero para ver sus horarios
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
