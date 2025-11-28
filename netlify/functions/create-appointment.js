import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método no permitido",
    };
  }

  try {
    const data = JSON.parse(event.body);

    const { error } = await supabase.from("appointments").insert({
      client_id: data.client_id,
      staff_id: data.staff_id,
      service_id: data.service_id,
      appointment_date: data.appointment_date,
      notes: data.notes || "",
    });

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Cita creada con éxito" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error en el servidor" }),
    };
  }
};
