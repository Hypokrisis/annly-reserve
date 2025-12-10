import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBarbers } from '@/hooks/useBarbers';
import { useSchedule } from '@/hooks/useSchedule';
import { usePermissions } from '@/hooks/usePermissions';
import { getDayName } from '@/utils';
import type { Barber } from '@/types';

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
                    <p className="text-gray-600">No tienes permisos para gestionar horarios.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Horarios</h1>
                    <p className="text-gray-600 mt-1">Configura los horarios de trabajo</p>
                </div>

                {/* Barber Selector */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selecciona un barbero
                    </label>
                    <select
                        value={selectedBarber?.id || ''}
                        onChange={(e) => {
                            const barber = barbers.find(b => b.id === e.target.value);
                            setSelectedBarber(barber || null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="">-- Selecciona un barbero --</option>
                        {barbers.filter(b => b.is_active).map((barber) => (
                            <option key={barber.id} value={barber.id}>
                                {barber.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Schedule Editor */}
                {selectedBarber ? (
                    loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="space-y-4">
                            {weekSchedule.map((day) => (
                                <div
                                    key={day.dayOfWeek}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={day.isActive}
                                                    onChange={() => handleToggleDay(day.dayOfWeek)}
                                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                                />
                                                <span className="text-lg font-semibold text-gray-900">
                                                    {getDayName(day.dayOfWeek)}
                                                </span>
                                            </label>
                                            {!day.isActive && (
                                                <span className="text-sm text-gray-500">(Cerrado)</span>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyToAll(day.dayOfWeek)}
                                            disabled={!day.isActive}
                                        >
                                            Copiar a todos
                                        </Button>
                                    </div>

                                    {day.isActive && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Hora de inicio
                                                </label>
                                                <input
                                                    type="time"
                                                    value={day.startTime}
                                                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Hora de cierre
                                                </label>
                                                <input
                                                    type="time"
                                                    value={day.endTime}
                                                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Save Button */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasChanges || loading}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Horarios'}
                                </Button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-xl p-12 text-center">
                        <p className="text-gray-600">
                            Selecciona un barbero para configurar sus horarios
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
