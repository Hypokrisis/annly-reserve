// Time helper functions

/**
 * Format time to HH:MM
 */
export const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Parse time string (HH:MM) to Date object (today's date with that time)
 */
export const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * Add minutes to a date
 */
export const addMinutes = (date: Date, minutes: number): Date => {
    return new Date(date.getTime() + minutes * 60000);
};

/**
 * Get difference in minutes between two dates
 */
export const getDifferenceInMinutes = (date1: Date, date2: Date): number => {
    return Math.floor((date2.getTime() - date1.getTime()) / 60000);
};

/**
 * Check if time1 is before time2
 */
export const isTimeBefore = (time1: string, time2: string): boolean => {
    return parseTime(time1) < parseTime(time2);
};

/**
 * Check if time1 is after time2
 */
export const isTimeAfter = (time1: string, time2: string): boolean => {
    return parseTime(time1) > parseTime(time2);
};

/**
 * Format time for display (12-hour format with AM/PM)
 */
export const formatTimeDisplay = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Generate time slots between start and end time
 */
export const generateTimeSlots = (
    startTime: string,
    endTime: string,
    slotDuration: number,
    interval: number = 15
): string[] => {
    const slots: string[] = [];
    let current = parseTime(startTime);
    const end = parseTime(endTime);

    while (addMinutes(current, slotDuration) <= end) {
        slots.push(formatTime(current));
        current = addMinutes(current, interval);
    }

    return slots;
};
