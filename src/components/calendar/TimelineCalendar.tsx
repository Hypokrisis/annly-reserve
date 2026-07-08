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
    let durationMins = 45;
    if (apt.end_time) {
      const [endHours, endMins] = apt.end_time.split(':').map(Number);
      durationMins = (endHours * 60 + endMins) - (hours * 60 + minutes);
    }

    if (durationMins <= 0) durationMins = 45;

    const startMins = (hours - startHour) * 60 + minutes;
    const left = startMins * minuteWidth;
    const width = durationMins * minuteWidth;

    let bgClasses = "bg-[#9bc287] text-[#22321c] border-[#86ad72]";
    if (apt.status === 'completed') bgClasses = "bg-[#22c55e] text-white border-[#16a34a]";
    if (apt.status === 'cancelled' || apt.status === 'no_show') bgClasses = "bg-[#ef4444] text-white border-[#b91c1c] opacity-70";
    if (apt.status === 'confirmed') bgClasses = "bg-gradient-to-r from-[#9bc287] to-[#3a7553] text-[#22321c] shadow-md shadow-[#9bc287]/20 hover:-translate-y-0.5";

    return {
      style: {
        left: `${left}px`,
        width: `${width - 4}px`,
      },
      classes: bgClasses
    };
  };

  const getServiceName = (id?: string) => {
    return services.find(s => s.id === id)?.name || 'Servicio';
  };

  return (
    <div className="rounded-[20px] border border-[#243529] overflow-hidden flex flex-col" style={{ background: '#131c17' }}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 gap-4" style={{ borderBottom: '1px solid #243529', background: 'rgba(29,42,35,0.5)' }}>
        <div className="flex items-center gap-2 rounded-full p-1" style={{ background: '#0e1611', border: '1px solid #243529' }}>
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full transition"
            style={{ color: '#f0f4ee' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1d2a23')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 font-bold text-sm capitalize min-w-[140px] text-center" style={{ color: '#f0f4ee' }}>
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full transition"
            style={{ color: '#f0f4ee' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1d2a23')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {isToday(selectedDate) && (
          <span className="text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            Hoy
          </span>
        )}
      </div>

      {/* Timeline Grid */}
      <div className="flex flex-1 overflow-hidden min-h-[400px]">
        {/* Y-Axis (Barbers) */}
        <div className="w-20 sm:w-32 shrink-0 z-30 flex flex-col sticky left-0" style={{ background: '#131c17', borderRight: '1px solid #243529' }}>
          <div className="h-10 sm:h-12 flex items-center justify-center" style={{ borderBottom: '1px solid #243529', background: '#131c17' }}>
            <span className="text-[9px] font-black uppercase tracking-tight" style={{ color: '#95ab8a' }}>Equipo</span>
          </div>
          <div className="flex-1 overflow-y-auto hidden-scrollbar">
            {activeBarbers.length > 0 ? activeBarbers.map(barber => (
              <div key={barber.id} className="h-20 sm:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 px-2" style={{ borderBottom: '1px solid #243529', background: '#131c17' }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)', color: '#22321c' }}>
                  {barber.name.charAt(0)}
                </div>
                <div className="min-w-0 text-center">
                  <p className="font-bold text-[10px] sm:text-xs truncate max-w-full" style={{ color: '#f0f4ee' }}>{barber.name.split(' ')[0]}</p>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-[10px] text-center italic" style={{ color: '#95ab8a' }}>Sin equipo</p>
              </div>
            )}
          </div>
        </div>

        {/* X-Axis & Scrollable Grid */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative scroll-smooth"
          style={{ background: '#090d0b' }}
        >
          <div style={{ width: `${hoursCount * hourWidth}px` }} className="min-h-full flex flex-col">
            {/* Hours Header */}
            <div className="h-10 sm:h-12 flex relative backdrop-blur-sm sticky top-0 z-20" style={{ borderBottom: '1px solid #243529', background: 'rgba(19,28,23,0.9)' }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ width: `${hourWidth}px`, borderRight: '1px solid rgba(36,53,41,0.5)', color: '#95ab8a' }}
                  className="shrink-0 flex items-center text-[10px] sm:text-xs font-bold px-3"
                >
                  <Clock size={12} className="mr-1.5 opacity-50" />
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="relative flex-1">
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {hours.map((hour) => (
                  <div key={`line-${hour}`} style={{ width: `${hourWidth}px`, borderRight: '1px solid rgba(36,53,41,0.2)' }} className="shrink-0 h-full"></div>
                ))}
              </div>

              {/* Rows for Barbers */}
              {activeBarbers.length > 0 ? activeBarbers.map(barber => {
                const barberApts = appointments.filter(a => a.barber_id === barber.id);

                return (
                  <div key={`row-${barber.id}`} className="h-20 sm:h-24 relative transition-colors" style={{ borderBottom: '1px solid rgba(36,53,41,0.5)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,42,35,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {barberApts.map(apt => {
                      const { style, classes } = getAppointmentStyle(apt);

                      const [h] = apt.start_time.split(':').map(Number);
                      if (h < startHour - 1 || h > endHour + 1) return null;

                      return (
                        <div
                          key={apt.id}
                          onClick={() => onAppointmentClick(apt)}
                          style={style}
                          className={`absolute top-1.5 bottom-1.5 sm:top-2 sm:bottom-2 rounded-lg sm:rounded-xl p-1.5 sm:p-2 cursor-pointer transition-all overflow-hidden border ${classes}`}
                          title={`${getServiceName(apt.service_id)} - ${apt.customer_name} (${apt.start_time})`}
                        >
                          <div className="text-[10px] sm:text-xs font-bold truncate leading-tight">{apt.customer_name}</div>
                          <div className="text-[9px] sm:text-[10px] opacity-80 truncate leading-tight mt-0.5">
                            {getServiceName(apt.service_id)}
                          </div>

                          {parseInt(style.width) > 70 && (
                            <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 text-[8px] sm:text-[9px] font-black opacity-60 bg-black/20 px-1 rounded uppercase">
                              {apt.start_time.slice(0, 5)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-20 italic text-sm" style={{ color: '#95ab8a' }}>
                  Configura tu equipo para ver la agenda
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
