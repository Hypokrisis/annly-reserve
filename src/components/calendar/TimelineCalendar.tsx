import { useRef, useEffect } from 'react';
import { Appointment, Barber, Service } from '@/types';
import { format, addDays, subDays, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface TimelineCalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  barbers: Barber[];
  services: Service[];
}

export function TimelineCalendar({ 
  appointments, 
  selectedDate, 
  onDateChange, 
  onAppointmentClick,
  barbers,
  services
}: TimelineCalendarProps) {
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Configuration
  const startHour = 8; // 08:00
  const endHour = 20; // 20:00
  const hoursCount = endHour - startHour + 1;
  const hours = Array.from({ length: hoursCount }, (_, i) => startHour + i);
  const hourWidth = 180; // pixels per hour
  const minuteWidth = hourWidth / 60;
  
  // Filter active barbers or those who have appointments
  const activeBarbers = barbers.filter(b => b.is_active || appointments.some(a => a.barber_id === b.id));

  useEffect(() => {
    // Scroll to current time if it's today
    if (isToday(selectedDate) && scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= startHour && currentHour <= endHour) {
        const scrollTo = (currentHour - startHour) * hourWidth;
        scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollTo - 200), behavior: 'smooth' });
      }
    }
  }, [selectedDate]);

  const getAppointmentStyle = (apt: Appointment) => {
    const [hours, minutes] = apt.start_time.split(':').map(Number);
    // Assuming 45 min duration if no end_time available
    let durationMins = 45; 
    if (apt.end_time) {
      const [endHours, endMins] = apt.end_time.split(':').map(Number);
      durationMins = (endHours * 60 + endMins) - (hours * 60 + minutes);
    }
    
    // Default to 45 if calculation fails or is <= 0
    if (durationMins <= 0) durationMins = 45;

    // Calculate left position
    const startMins = (hours - startHour) * 60 + minutes;
    const left = startMins * minuteWidth;
    const width = durationMins * minuteWidth;

    // Determine colors based on status
    let bgClasses = "bg-space-primary text-white border-space-primary-dark";
    if (apt.status === 'completed') bgClasses = "bg-space-success text-white border-green-700";
    if (apt.status === 'cancelled' || apt.status === 'no_show') bgClasses = "bg-space-danger text-white border-red-700 opacity-70";
    // Using a subtle purple for pending or unconfirmed if needed, but standard is primary green
    if (apt.status === 'confirmed') bgClasses = "bg-gradient-to-r from-space-primary to-[#3a7553] text-white shadow-md shadow-space-primary/20 hover:-translate-y-0.5";

    return {
      style: {
        left: `${left}px`,
        width: `${width - 4}px`, // subtract gap
      },
      classes: bgClasses
    };
  };

  const getServiceName = (id?: string) => {
    return services.find(s => s.id === id)?.name || 'Servicio';
  };

  return (
    <div className="bg-space-card rounded-3xl shadow-sm border border-space-border overflow-hidden flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-b border-space-border gap-4 bg-space-card2/50">
        <div className="flex items-center gap-2 bg-white rounded-full p-1 border border-space-border shadow-sm">
          <button 
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-space-bg text-space-text transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 font-bold text-sm text-space-text capitalize font-serif min-w-[140px] text-center">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
          <button 
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-space-bg text-space-text transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        
        {isToday(selectedDate) && (
          <span className="text-[10px] uppercase tracking-widest font-black text-space-success bg-space-success/10 px-3 py-1.5 rounded-full border border-space-success/20">
            Hoy
          </span>
        )}
      </div>

      {/* Timeline Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Y-Axis (Barbers) */}
        <div className="w-24 sm:w-40 border-r border-space-border bg-white shrink-0 z-20 flex flex-col">
          <div className="h-12 border-b border-space-border flex items-center justify-center bg-space-card2/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-space-muted">Equipo</span>
          </div>
          <div className="flex-1 overflow-y-auto hidden-scrollbar">
            {activeBarbers.map(barber => (
              <div key={barber.id} className="h-24 border-b border-space-border flex flex-col items-center sm:flex-row sm:items-center sm:px-4 justify-center sm:justify-start gap-3 bg-white">
                <div className="w-10 h-10 rounded-full bg-space-primary-light/30 flex items-center justify-center text-space-primary font-bold text-sm shrink-0 border border-space-primary/20">
                  {barber.name.charAt(0)}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="font-bold text-space-text text-sm truncate">{barber.name}</p>
                  <p className="text-[10px] text-space-muted uppercase tracking-wider truncate">Barbero</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* X-Axis & Scrollable Grid */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#fbfdf9]"
        >
          <div style={{ width: `${hoursCount * hourWidth}px` }} className="min-h-full">
            {/* Hours Header */}
            <div className="h-12 border-b border-space-border flex relative bg-space-card2/30 sticky top-0 z-10">
              {hours.map((hour) => (
                <div 
                  key={hour} 
                  style={{ width: `${hourWidth}px` }}
                  className="shrink-0 flex items-center border-r border-space-border/50 text-xs font-bold text-space-muted px-3"
                >
                  <Clock size={12} className="mr-1.5 opacity-50" />
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="relative">
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {hours.map((hour) => (
                  <div key={`line-${hour}`} style={{ width: `${hourWidth}px` }} className="shrink-0 border-r border-space-border/30 h-full"></div>
                ))}
              </div>

              {/* Rows for Barbers */}
              {activeBarbers.map(barber => {
                const barberApts = appointments.filter(a => a.barber_id === barber.id);
                
                return (
                  <div key={`row-${barber.id}`} className="h-24 border-b border-space-border relative hover:bg-space-gold/5 transition-colors">
                    {barberApts.map(apt => {
                      const { style, classes } = getAppointmentStyle(apt);
                      
                      // Skip if completely out of bounds (before startHour)
                      const [h] = apt.start_time.split(':').map(Number);
                      if (h < startHour - 1 || h > endHour + 1) return null;

                      return (
                        <div
                          key={apt.id}
                          onClick={() => onAppointmentClick(apt)}
                          style={style}
                          className={`absolute top-2 bottom-2 rounded-xl p-2 cursor-pointer transition-all overflow-hidden border ${classes}`}
                          title={`${getServiceName(apt.service_id)} - ${apt.customer_name} (${apt.start_time})`}
                        >
                          <div className="text-xs font-bold truncate leading-tight mb-1">{apt.customer_name}</div>
                          <div className="text-[10px] opacity-90 truncate flex items-center gap-1">
                            {getServiceName(apt.service_id)}
                          </div>
                          
                          {/* If pill is wide enough, show time */}
                          {parseInt(style.width) > 80 && (
                            <div className="absolute bottom-2 right-2 text-[9px] font-black opacity-70 bg-black/10 px-1.5 rounded">
                              {apt.start_time.slice(0, 5)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
