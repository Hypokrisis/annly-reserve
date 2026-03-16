import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  isBefore,
  startOfDay,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthGridCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  minDate?: Date; // Defaults to today
}

export function MonthGridCalendar({ selectedDate, onDateSelect, minDate }: MonthGridCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Sync currentMonth with selectedDate when it changes externally
  useEffect(() => {
    if (selectedDate) {
      const parsedDate = parseISO(selectedDate + 'T12:00:00');
      if (!isNaN(parsedDate.getTime()) && !isSameMonth(parsedDate, currentMonth)) {
        setCurrentMonth(startOfMonth(parsedDate));
      }
    }
  }, [selectedDate]);

  const today = startOfDay(minDate || new Date());
  
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  
  // Get days from Sun to Sat encompassing the current month
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); 
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "yyyy-MM-dd";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Handle parsing the selected date string properly to avoid timezone shifts
  const selectedDateObj = selectedDate ? parseISO(selectedDate + 'T12:00:00') : null;

  return (
    <div className="bg-space-card rounded-3xl p-5 shadow-sm border border-space-border w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={prevMonth}
          disabled={isBefore(startOfMonth(subMonths(currentMonth, 1)), startOfMonth(today))}
          className="p-2 rounded-full hover:bg-space-bg transition disabled:opacity-30 disabled:hover:bg-transparent"
          type="button"
        >
          <ChevronLeft size={20} className="text-space-text" />
        </button>
        <h2 className="text-base font-bold text-space-text capitalize font-serif tracking-wide">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-space-bg transition"
          type="button"
        >
          <ChevronRight size={20} className="text-space-text" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-space-muted py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          // Compare using startOfDay to ignore time parts
          const isPast = isBefore(startOfDay(day), today);
          const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={idx}
              type="button"
              disabled={isPast || !isCurrentMonth}
              onClick={() => onDateSelect(format(day, dateFormat))}
              className={`
                aspect-square flex items-center justify-center rounded-2xl text-sm font-semibold transition-all relative
                ${!isCurrentMonth ? 'text-transparent pointer-events-none' : ''}
                ${isPast && isCurrentMonth ? 'text-space-muted/30 cursor-not-allowed' : ''}
                ${!isPast && isCurrentMonth && !isSelected ? 'text-space-text hover:bg-space-bg hover:text-space-primary' : ''}
                ${isSelected ? 'bg-space-primary text-white shadow-md shadow-space-primary/30 transform scale-[1.05]' : ''}
              `}
            >
              {format(day, 'd')}
              {isCurrentDay && !isSelected && (
                <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-space-primary"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
