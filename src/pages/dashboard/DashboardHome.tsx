import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardHome() {
    const { business, barbers, services } = useBusiness();
    const { user, role } = useAuth();

    return (
        <DashboardLayout>
            <div className="max-w-6xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Bienvenido, {user?.email}
                </h1>
                <p className="text-gray-600 mb-8">
                    Rol: <span className="font-semibold capitalize">{role}</span>
                </p>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Servicios</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    {services.length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">✂️</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Barberos</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    {barbers.filter(b => b.is_active).length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Negocio</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                    {business?.name || 'N/A'}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🏪</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a
                            href="/dashboard/services"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Gestionar Servicios</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Añade o edita los servicios que ofreces
                            </p>
                        </a>
                        <a
                            href="/dashboard/barbers"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Gestionar Barberos</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Administra tu equipo de trabajo
                            </p>
                        </a>
                        <a
                            href="/dashboard/schedules"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Configurar Horarios</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Define los horarios de trabajo
                            </p>
                        </a>
                        <a
                            href="/dashboard/settings"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Configuración</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Ajusta la configuración del negocio
                            </p>
                        </a>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
