import type { NotificationType } from '@/types';

/**
 * Send notification (email)
 *
 * STATUS: No-op — Email sending is intentionally disabled.
 * The platform relies on WhatsApp (Twilio) via Supabase Edge Functions for all
 * client notifications (confirmations, reminders, cancellations).
 *
 * TO ENABLE EMAIL: Uncomment the fetch block below, create a Supabase Edge
 * Function 'send-email' using Resend or SendGrid, and set the required env vars.
 */
export const sendNotification = async (
    _type: NotificationType,
    recipientEmail: string,
    data: Record<string, any>
): Promise<void> => {
    // No-op: intentionally not sending or logging to DB to avoid false records.
    // The platform uses WhatsApp (Twilio Edge Functions) for all notifications.
    if (import.meta.env.DEV) {
        console.log(`[notifications] Email skipped (WhatsApp-first mode): to=${recipientEmail}`, data);
    }

    // TODO: Uncomment when a real email provider is configured:
    // await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    //   },
    //   body: JSON.stringify({ type: _type, recipientEmail, data }),
    // });
};

/** Send appointment confirmation email (no-op — WhatsApp handles this via Edge Function) */
export const sendAppointmentConfirmation = async (appointmentData: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    businessName: string;
}): Promise<void> => {
    await sendNotification('appointment_confirmation' as NotificationType, appointmentData.customerEmail, appointmentData);
};

/** Send appointment cancellation email (no-op — WhatsApp handles this via Edge Function) */
export const sendAppointmentCancellation = async (appointmentData: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    businessName: string;
}): Promise<void> => {
    await sendNotification('appointment_cancellation' as NotificationType, appointmentData.customerEmail, appointmentData);
};

/** Send appointment reminder email (no-op — WhatsApp handles this via Edge Function) */
export const sendAppointmentReminder = async (appointmentData: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    businessName: string;
}): Promise<void> => {
    await sendNotification('appointment_reminder' as NotificationType, appointmentData.customerEmail, appointmentData);
};
