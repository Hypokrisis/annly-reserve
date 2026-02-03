import { supabase } from "@/lib/supabase";

export type CreateAppointmentPayload = {
    business_id: string;
    barber_id: string;
    service_id: string;
    appointment_date: string; // "YYYY-MM-DD"
    start_time: string;       // "HH:MM:SS"
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_notes?: string;
};

export async function createAppointment(payload: CreateAppointmentPayload) {
    // 1. Verificar sesión activa
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const session = sessionData.session;
    if (!session) {
        throw new Error("Debes iniciar sesión para crear una cita.");
    }

    // 2. Insertar cita (SIN enviar full_name, ni end_time)
    // Se usa customer_name explícitamente
    const { data, error } = await supabase
        .from("appointments")
        .insert([
            {
                business_id: payload.business_id,
                barber_id: payload.barber_id,
                service_id: payload.service_id,
                appointment_date: payload.appointment_date,
                start_time: payload.start_time,
                // Campos de cliente
                customer_name: payload.customer_name,
                customer_email: payload.customer_email,
                customer_phone: payload.customer_phone,
                customer_notes: payload.customer_notes ?? null,
                // IMPORTANTE: customer_user_id se asigna automáticamente mediante RLS o default si se quisiera,
                // pero idealmente RLS o el backend lo asocian. 
                // Si queremos asociarlo explícitamente:
                customer_user_id: session.user.id
            },
        ])
        .select("*")
        .single();

    if (error) throw error;
    return data;
}
