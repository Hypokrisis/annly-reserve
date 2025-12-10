// Date helper functions

/**
 * Format a date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Parse a date string (YYYY-MM-DD) to Date object
 */
export const parseDate = (dateString: string): Date => {
    return new Date(dateString + 'T00:00:00');
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    return formatDate(date1) === formatDate(date2);
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Get day of week (0=Sunday, 6=Saturday)
 */
export const getDayOfWeek = (date: Date): number => {
    return date.getDay();
};

/**
 * Get day name from day of week number
 */
export const getDayName = (dayOfWeek: number): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek];
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: Date): boolean => {
    return date < new Date();
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
};
