// Formatter helper functions

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
    }).format(amount);
};

/**
 * Format phone number for display
 */
export const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return phone;
};

/**
 * Format date for display (e.g., "10 de diciembre, 2025")
 */
export const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('es-DO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
};

/**
 * Format date and time for display
 */
export const formatDateTimeDisplay = (dateString: string, timeString: string): string => {
    return `${formatDateDisplay(dateString)} a las ${timeString}`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Generate slug from string
 */
export const generateSlug = (str: string): string => {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
};
