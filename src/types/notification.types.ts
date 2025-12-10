// Notification Types
export type NotificationType =
    | 'appointment_created'
    | 'appointment_cancelled'
    | 'appointment_rescheduled'
    | 'appointment_reminder'
    | 'user_invited';

export type NotificationStatus = 'sent' | 'failed';

export interface Notification {
    id: string;
    appointment_id?: string;
    type: NotificationType;
    recipient_email: string;
    subject?: string;
    body?: string;
    sent_at: string;
    status: NotificationStatus;
}

export interface CreateNotificationData {
    appointment_id?: string;
    type: NotificationType;
    recipient_email: string;
    subject: string;
    body: string;
}
