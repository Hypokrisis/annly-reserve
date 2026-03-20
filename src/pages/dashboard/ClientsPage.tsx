import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/supabaseClient';
import { User, MessageSquare, Calendar, History, Search, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Client {
    email: string;
    name: string;
    phone: string;
    last_visit: string;
    total_appointments: number;
}

export default function ClientsPage() {
    const { business } = useBusiness();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (business?.id) {
            loadClients();
        }
    }, [business?.id]);

    const loadClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('customer_email, customer_name, customer_phone, appointment_date, status')
                .eq('business_id', business?.id)
                .order('appointment_date', { ascending: false });

            if (error) throw error;

            // Group by email to get unique clients
            const clientMap = new Map<string, Client>();
            
            data.forEach(apt => {
                if (!clientMap.has(apt.customer_email)) {
                    clientMap.set(apt.customer_email, {
                        email: apt.customer_email,
                        name: apt.customer_name,
                        phone: apt.customer_phone,
                        last_visit: apt.appointment_date,
                        total_appointments: 1
                    });
                } else {
                    const existing = clientMap.get(apt.customer_email)!;
                    existing.total_appointments += 1;
                }
            });

            setClients(Array.from(clientMap.values()));
        } catch (err) {
            console.error('Error loading clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = (client: Client) => {
        if (!business) return;
        
        const bookingLink = business.whatsapp_booking_link || `${window.location.origin}/book/${business.slug}`;
        const template = business.whatsapp_reminder_template || '¡Hola {{customer_name}}! Hace tiempo que no nos visitas en {{business_name}}. ¿Te gustaría agendar tu próximo recorte? Puedes hacerlo aquí: {{booking_link}}';
        
        const message = template
            .replace('{{customer_name}}', client.name)
            .replace('{{business_name}}', business.name)
            .replace('{{booking_link}}', bookingLink);

        const waUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const getClientStatus = (lastVisit: string) => {
        const lastVisitDate = new Date(lastVisit);
        const diffDays = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 21) return { label: 'En Riesgo', color: 'bg-red-100 text-red-700 border-red-200' };
        if (diffDays > 14) return { label: 'Toca Recorte', color: 'bg-amber-100 text-amber-700 border-amber-200' };
        return { label: 'Reciente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-up">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-space-text tracking-tight uppercase italic">Mis Clientes</h1>
                        <p className="text-space-muted font-bold tracking-widest uppercase text-[10px] mt-1 flex items-center gap-2">
                             <User size={12} className="text-space-primary" /> Base de datos de clientes y fidelización
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card p-4 mb-8 flex items-center gap-4 bg-white border-2 border-space-border/50">
                    <Search className="text-space-muted" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente por nombre, email o teléfono..."
                        className="flex-1 bg-transparent border-none outline-none text-space-text font-bold text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-space-bg rounded-lg border border-space-border text-[10px] font-black text-space-muted uppercase">
                         <Filter size={10} /> {filteredClients.length} Clientes
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : filteredClients.length === 0 ? (
                    <div className="card p-20 text-center border-dashed border-4 border-space-border/50 bg-transparent">
                        <User size={60} className="mx-auto text-space-border mb-4 opacity-50" />
                        <h3 className="text-xl font-black text-space-text uppercase tracking-tight">No hay clientes aún</h3>
                        <p className="text-sm text-space-muted font-bold mt-2 uppercase tracking-widest">Las personas que reserven aparecerán aquí automáticamente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredClients.map((client) => {
                            const status = getClientStatus(client.last_visit);
                            return (
                                <div key={client.email} className="card p-6 bg-white border-2 border-space-border/50 hover:border-space-primary transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-space-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700" />
                                    
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-space-text text-white rounded-[1.2rem] flex items-center justify-center font-black text-2xl shadow-lg">
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-black text-space-text uppercase tracking-tight">{client.name}</h3>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    <p className="text-xs text-space-muted font-bold flex items-center gap-1.5 leading-none">
                                                        <MessageSquare size={12} className="text-space-primary" /> {client.phone}
                                                    </p>
                                                    <p className="text-xs text-space-muted font-bold flex items-center gap-1.5 leading-none">
                                                        <History size={12} className="text-space-primary" /> {client.total_appointments} Visitas
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-space-border/50">
                                            <div className="text-right flex-1 lg:flex-initial">
                                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest mb-1">Última Visita</p>
                                                <p className="text-sm font-black text-space-text uppercase tracking-tight flex items-center gap-2">
                                                    <Calendar size={14} className="text-space-primary" />
                                                    {format(new Date(client.last_visit), "d 'de' MMMM", { locale: es })}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => handleSendReminder(client)}
                                                className="w-full sm:w-auto px-6 h-12 bg-space-primary hover:bg-space-primary/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-space-primary/20 flex items-center justify-center gap-3"
                                            >
                                                <MessageSquare size={16} /> Recordar vía WA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
