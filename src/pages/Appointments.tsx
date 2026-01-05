import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, MapPin, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AppointmentType {
    id: string;
    start_time: string;
    status: string;
    services: {
        name: string;
        price: number;
        duration_minutes: number;
    };
    barbers: {
        name: string;
    };
    businesses: {
        name: string;
        slug: string;
        address?: string;
    };
}

export default function Appointments() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelLoading, setCancelLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchAppointments = async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError('');
            const { data, error: fetchError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    status,
                    services (name, price, duration_minutes),
                    barbers (name),
                    businesses (name, slug)
                `)
                .eq('customer_user_id', user.id)
                .order('start_time', { ascending: false });

            if (fetchError) throw fetchError;

            // Map data to handle Supabase's array return for joins
            const formatted = (data as any[] || []).map(apt => ({
                ...apt,
                services: Array.isArray(apt.services) ? apt.services[0] : apt.services,
                barbers: Array.isArray(apt.barbers) ? apt.barbers[0] : apt.barbers,
                businesses: Array.isArray(apt.businesses) ? apt.businesses[0] : apt.businesses,
            }));

            setAppointments(formatted);
        } catch (err: any) {
            console.error('Error loading appointments:', err);
            setError('No pudimos cargar tus citas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [user]);

    const handleCancel = async (id: string) => {
        if (!confirm('¿Estás seguro que deseas cancelar esta cita?')) return;

        setCancelLoading(id);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

            // Refresh list
            await fetchAppointments();
        } catch (err: any) {
            console.error('Error cancelling:', err);
            alert('Error al cancelar la cita. Intenta de nuevo.');
        } finally {
            setCancelLoading(null);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-4">Inicia sesión para ver tus citas</h2>
                    <Link to="/login" className="bg-black text-white px-6 py-3 rounded-lg">Iniciar Sesión</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Mis Citas</h1>
                    <Link to="/home" className="text-indigo-600 font-medium hover:text-indigo-800">
                        ← Volver al Inicio
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes citas programadas</h3>
                        <p className="text-gray-500 mb-6">Busca una barbería y reserva tu próxima visita.</p>
                        <Link to="/home" className="bg-black text-white px-6 py-3 rounded-xl font-bold">
                            Explorar Barberías
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((apt) => (
                            <div key={apt.id} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">
                                            {apt.services?.name || 'Servicio'}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${apt.status === 'cancelled'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {apt.status === 'cancelled' ? 'Cancelada' : 'Confirmada'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            <span className="capitalize">{format(new Date(apt.start_time), 'EEEE d MMMM, yyyy', { locale: es })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} />
                                            <span>{format(new Date(apt.start_time), 'h:mm a')} ({apt.services?.duration_minutes} min)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} />
                                            <span>{apt.businesses?.name} — {apt.barbers?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {apt.status !== 'cancelled' && (
                                    <button
                                        onClick={() => handleCancel(apt.id)}
                                        disabled={!!cancelLoading}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-100 transition disabled:opacity-50 text-sm font-medium"
                                    >
                                        {cancelLoading === apt.id ? (
                                            <span className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></span>
                                        ) : (
                                            <XCircle size={16} />
                                        )}
                                        {cancelLoading === apt.id ? 'Cancelando...' : 'Cancelar Cita'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
