import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
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
            <div className="max-w-4xl animate-fade-in">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Horarios</h1>
                    <p className="text-sm text-space-muted mt-1">Configura los horarios de trabajo</p>
                </div>

                {/* Barber Selector */}
                <div className="bg-space-card rounded-2xl p-6 shadow-lg border border-space-border mb-8">
                    <label className="block text-sm font-medium text-space-muted mb-3">
                        Selecciona un barbero
                    </label>
                    <div className="relative">
                        <select
                            value={selectedBarber?.id || ''}
                            onChange={(e) => {
                                const barber = barbers.find(b => b.id === e.target.value);
                                setSelectedBarber(barber || null);
                            }}
                            className="w-full pl-4 pr-10 py-3 bg-space-bg border border-space-border rounded-xl text-white focus:ring-2 focus:ring-space-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="">-- Selecciona un barbero --</option>
                            {barbers.filter(b => b.is_active).map((barber) => (
                                <option key={barber.id} value={barber.id} className="bg-space-card text-white">
                                    {barber.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-space-muted pointer-events-none" size={18} />
                    </div>
                </div>

                {/* Schedule Editor */}
                {selectedBarber ? (
                    loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {weekSchedule.map((day) => (
                                <div
                                    key={day.dayOfWeek}
                                    className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${day.isActive
                                        ? 'bg-space-card border-space-border shadow-lg shadow-space-primary/5'
                                        : 'bg-space-card/40 border-space-border/50'
                                        }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${day.isActive ? 'bg-space-primary border-space-primary' : 'bg-transparent border-space-muted'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={day.isActive}
                                                        onChange={() => handleToggleDay(day.dayOfWeek)}
                                                        className="hidden"
                                                    />
                                                    {day.isActive && <Check size={14} className="text-white" />}
                                                </div>
                                                <span className={`text-lg font-bold transition-colors ${day.isActive ? 'text-white' : 'text-space-muted group-hover:text-space-text'}`}>
                                                    {getDayName(day.dayOfWeek)}
                                                </span>
                                            </label>
                                            {!day.isActive && (
                                                <span className="text-xs text-space-muted bg-space-card2 px-2 py-0.5 rounded border border-space-border uppercase font-bold tracking-wider opacity-60">Cerrado</span>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyToAll(day.dayOfWeek)}
                                            disabled={!day.isActive}
                                            className={`text-xs ${day.isActive ? 'text-space-primary hover:text-white hover:bg-space-primary/20' : 'text-space-muted opacity-50 cursor-not-allowed'}`}
                                        >
                                            <Copy size={14} className="mr-1.5" />
                                            Copiar a todos
                                        </Button>
                                    </div>

                                    {day.isActive && (
                                        <div className="grid grid-cols-2 gap-4 animate-fade-in text-space-text">
                                            <div>
                                                <label className="flex items-center gap-2 text-xs font-bold text-space-muted uppercase tracking-wider mb-2">
                                                    <Clock size={12} /> Inicio
                                                </label>
                                                <input
                                                    type="time"
                                                    value={day.startTime}
                                                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                                                    className="w-full px-4 py-2 bg-space-bg border border-space-border rounded-lg text-white focus:ring-2 focus:ring-space-primary focus:border-transparent outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="flex items-center gap-2 text-xs font-bold text-space-muted uppercase tracking-wider mb-2">
                                                    <Clock size={12} /> Cierre
                                                </label>
                                                <input
                                                    type="time"
                                                    value={day.endTime}
                                                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                                                    className="w-full px-4 py-2 bg-space-bg border border-space-border rounded-lg text-white focus:ring-2 focus:ring-space-primary focus:border-transparent outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Save Button */}
                            <div className="flex justify-end gap-3 pt-6 sticky bottom-4 z-10">
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasChanges || loading}
                                    className={`shadow-xl px-8 py-4 text-base transition-all ${!hasChanges ? 'opacity-50 cursor-not-allowed bg-space-card2 text-space-muted' : 'bg-gradient-to-r from-space-primary to-space-purple hover:scale-105 hover:shadow-space-primary/20 border-none'}`}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Horarios'}
                                </Button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-space-card/50 rounded-2xl p-12 text-center border-2 border-dashed border-space-border">
                        <div className="w-16 h-16 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} className="text-space-muted" />
                        </div>
                        <p className="text-space-muted">
                            Selecciona un barbero para configurar sus horarios
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
