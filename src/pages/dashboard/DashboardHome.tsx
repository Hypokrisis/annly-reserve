import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors, Users, Calendar, Settings, ArrowRight, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function DashboardHome() {
    const { business, barbers, services } = useBusiness();
    const { user, role } = useAuth();
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/book/${business?.slug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        Bienvenido a Spacey, <span className="text-transparent bg-clip-text bg-gradient-to-r from-space-primary to-space-purple">{user?.email?.split('@')[0]}</span>
                    </h1>
                    <p className="text-space-muted flex items-center gap-2">
                        Rol actual: <span className="font-bold text-space-primary capitalize bg-space-primary/10 px-3 py-0.5 rounded-full text-xs border border-space-primary/20">{role}</span>
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-space-card border border-space-border rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-space-primary/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-space-primary/10 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-space-muted uppercase tracking-wider">Servicios Activos</p>
                                <div className="p-2 bg-space-bg rounded-lg text-space-primary">
                                    <Scissors size={20} />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-bold text-white">{services.length}</h3>
                                <span className="text-xs text-space-success font-medium">+2 nuevos</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-space-card border border-space-border rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-space-purple/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-space-purple/10 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-space-muted uppercase tracking-wider">Profesionales</p>
                                <div className="p-2 bg-space-bg rounded-lg text-space-purple">
                                    <Users size={20} />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-bold text-white">{barbers.filter(b => b.is_active).length}</h3>
                                <span className="text-xs text-space-muted font-medium">/ 5 máximo</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-space-card border border-space-border rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-space-pink/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-space-pink/10 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-space-muted uppercase tracking-wider">Negocio</p>
                                <div className="p-2 bg-space-bg rounded-lg text-space-pink">
                                    <Settings size={20} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white truncate max-w-full">{business?.name || '---'}</h3>
                                <p className="text-xs text-space-muted mt-1 truncate">{business?.address || 'Sin dirección configurada'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Public Link Card */}
                <div className="bg-gradient-to-r from-space-primary/10 via-space-purple/10 to-space-pink/10 border border-space-primary/20 rounded-2xl p-8 relative overflow-hidden mb-12">
                    <div className="absolute inset-0 bg-space-bg/40 backdrop-blur-3xl z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2">Tu Página de Reservas Pública</h2>
                            <p className="text-space-muted mb-6">Esta es la URL que debes compartir en tu Instagram, WhatsApp o Web para recibir reservas automáticas 24/7.</p>

                            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                                <div className="flex-1 bg-space-bg border border-space-border rounded-xl px-4 py-3 font-mono text-sm text-space-text flex items-center justify-between group hover:border-space-primary transition-colors">
                                    <span className="truncate mr-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {window.location.origin}/book/{business?.slug}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyLink}
                                        className="flex items-center gap-2 px-5 py-3 bg-space-card hover:bg-space-card2 text-white border border-space-border hover:border-space-primary/50 rounded-xl font-bold text-sm transition shadow-lg"
                                    >
                                        {copied ? <Check size={18} className="text-space-success" /> : <Copy size={18} />}
                                        {copied ? 'Copiado' : 'Copiar'}
                                    </button>
                                    <a
                                        href={`/book/${business?.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-space-primary to-space-purple hover:opacity-90 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-space-primary/20"
                                    >
                                        <ExternalLink size={18} />
                                        Visitar
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:block opacity-80 animate-float-slow">
                            <div className="w-24 h-24 bg-gradient-to-br from-space-primary to-space-purple rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-space-primary/30">
                                <ExternalLink size={40} className="text-white -rotate-12" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-6 bg-space-primary rounded-full"></div>
                        <h2 className="text-xl font-bold text-white">Acciones Rápidas</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            to="/dashboard/services"
                            className="bg-space-card border border-space-border p-5 rounded-2xl hover:border-space-primary/50 hover:bg-space-card2 transition-all group hover:-translate-y-1"
                        >
                            <div className="w-10 h-10 bg-space-bg border border-space-border rounded-xl flex items-center justify-center mb-4 group-hover:border-space-primary group-hover:shadow-lg group-hover:shadow-space-primary/10 transition-all">
                                <Scissors size={20} className="text-space-muted group-hover:text-space-primary transition-colors" />
                            </div>
                            <h3 className="font-bold text-white mb-1">Servicios</h3>
                            <p className="text-xs text-space-muted mb-4">Configura precios y duración</p>
                            <div className="flex items-center text-xs font-bold text-space-primary opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                Gestionar <ArrowRight size={12} className="ml-1" />
                            </div>
                        </Link>

                        <Link
                            to="/dashboard/barbers"
                            className="bg-space-card border border-space-border p-5 rounded-2xl hover:border-space-purple/50 hover:bg-space-card2 transition-all group hover:-translate-y-1"
                        >
                            <div className="w-10 h-10 bg-space-bg border border-space-border rounded-xl flex items-center justify-center mb-4 group-hover:border-space-purple group-hover:shadow-lg group-hover:shadow-space-purple/10 transition-all">
                                <Users size={20} className="text-space-muted group-hover:text-space-purple transition-colors" />
                            </div>
                            <h3 className="font-bold text-white mb-1">Equipo</h3>
                            <p className="text-xs text-space-muted mb-4">Añade o edita barberos</p>
                            <div className="flex items-center text-xs font-bold text-space-purple opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                Gestionar <ArrowRight size={12} className="ml-1" />
                            </div>
                        </Link>

                        <Link
                            to="/dashboard/schedules"
                            className="bg-space-card border border-space-border p-5 rounded-2xl hover:border-space-pink/50 hover:bg-space-card2 transition-all group hover:-translate-y-1"
                        >
                            <div className="w-10 h-10 bg-space-bg border border-space-border rounded-xl flex items-center justify-center mb-4 group-hover:border-space-pink group-hover:shadow-lg group-hover:shadow-space-pink/10 transition-all">
                                <Calendar size={20} className="text-space-muted group-hover:text-space-pink transition-colors" />
                            </div>
                            <h3 className="font-bold text-white mb-1">Horarios</h3>
                            <p className="text-xs text-space-muted mb-4">Define disponibilidad</p>
                            <div className="flex items-center text-xs font-bold text-space-pink opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                Configurar <ArrowRight size={12} className="ml-1" />
                            </div>
                        </Link>

                        <Link
                            to="/dashboard/appointments"
                            className="bg-space-card border border-space-border p-5 rounded-2xl hover:border-space-yellow/50 hover:bg-space-card2 transition-all group hover:-translate-y-1"
                        >
                            <div className="w-10 h-10 bg-space-bg border border-space-border rounded-xl flex items-center justify-center mb-4 group-hover:border-space-yellow group-hover:shadow-lg group-hover:shadow-space-yellow/10 transition-all">
                                <Settings size={20} className="text-space-muted group-hover:text-space-yellow transition-colors" />
                            </div>
                            <h3 className="font-bold text-white mb-1">Citas</h3>
                            <p className="text-xs text-space-muted mb-4">Ver agenda del día</p>
                            <div className="flex items-center text-xs font-bold text-space-yellow opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                Revisar <ArrowRight size={12} className="ml-1" />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
