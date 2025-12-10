import { supabase } from '../supabaseClient';
import type { NotificationType, CreateNotificationData } from '@/types';

/**
 * Send notification (email)
 * This is a placeholder - in production, this would call a Netlify Function
 * that integrates with SendGrid, Resend, or similar email service
 */
export const sendNotification = async (
    type: NotificationType,
    recipientEmail: string,
    data: Record<string, any>
): Promise<void> => {
    try {
        // Log notification to database
        await supabase.from('notifications').insert({
            type,
            recipient_email: recipientEmail,
            subject: getSubject(type),
            body: getBody(type, data),
            status: 'sent',
            sent_at: new Date().toISOString(),
        });

        // TODO: In production, call Netlify Function to send actual email
        // await fetch('/.netlify/functions/send-email', {
        //   method: 'POST',
        //   body: JSON.stringify({ type, recipientEmail, data }),
        // });

        console.log(`Notification sent: ${type} to ${recipientEmail}`);
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

/**
 * Send appointment confirmation email
 */
export const sendAppointmentConfirmation = async (appointmentData: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    businessName: string;
}): Promise<void> => {
    await sendNotification('appointment_confirmation', appointmentData.customerEmail, appointmentData);
};

/**
 * Send appointment cancellation email
 */
export const sendAppointmentCancellation = async (appointmentData: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    businessName: string;
}): Promise<void> => {
    await sendNotification('appointment_cancellation', appointmentData.customerEmail, appointmentData);
};

/**
 * Send appointment reminder email
 */
export const sendAppointmentReminder = async (appointmentData: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    businessName: string;
}): Promise<void> => {
    await sendNotification('appointment_reminder', appointmentData.customerEmail, appointmentData);
};

/**
 * Get email subject based on notification type
 */
function getSubject(type: NotificationType): string {
    const subjects = {
        appointment_confirmation: 'Confirmación de Cita',
        appointment_cancellation: 'Cita Cancelada',
        appointment_reminder: 'Recordatorio de Cita',
        user_invitation: 'Invitación al Sistema',
    };

    return subjects[type] || 'Notificación';
}

/**
 * Get email body based on notification type and data
 */
function getBody(type: NotificationType, data: Record<string, any>): string {
    switch (type) {
        case 'appointment_confirmation':
            return `Hola ${data.customerName},\n\nTu cita ha sido confirmada:\n\nServicio: ${data.serviceName}\nBarbero: ${data.barberName}\nFecha: ${data.date}\nHora: ${data.time}\n\nGracias por elegir ${data.businessName}!`;

        case 'appointment_cancellation':
            return `Hola ${data.customerName},\n\nTu cita ha sido cancelada:\n\nServicio: ${data.serviceName}\nFecha: ${data.date}\nHora: ${data.time}\n\nSi tienes alguna pregunta, contáctanos.`;

        case 'appointment_reminder':
            return `Hola ${data.customerName},\n\nEste es un recordatorio de tu cita:\n\nServicio: ${data.serviceName}\nBarbero: ${data.barberName}\nFecha: ${data.date}\nHora: ${data.time}\n\nTe esperamos en ${data.businessName}!`;

        default:
            return 'Notificación del sistema';
    }
}
