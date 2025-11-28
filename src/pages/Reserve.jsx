import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Reserve() {
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  const [clientName, setClientName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data: servicesData } = await supabase.from("services").select("*");
      setServices(servicesData || []);

      const { data: staffData } = await supabase.from("staff").select("*");
      setStaff(staffData || []);
    };

    loadData();
  }, []);

  const handleSubmit = async () => {
    const payload = {
      client_id: clientName,
      service_id: serviceId,
      staff_id: staffId,
      appointment_date: date,
      notes,
    };

    const res = await fetch("/.netlify/functions/create-appointment", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    alert(json.message || json.error);
  };

  return (
    <div className="p-8 max-w-lg mx-auto text-white">
      <h1 className="text-3xl font-bold mb-4">Reservar Cita</h1>

      <input
        className="w-full mb-3 p-2 text-black"
        placeholder="Nombre del cliente"
        onChange={(e) => setClientName(e.target.value)}
      />

      <select className="w-full mb-3 p-2 text-black" onChange={(e) => setServiceId(e.target.value)}>
        <option>Seleccionar servicio</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select className="w-full mb-3 p-2 text-black" onChange={(e) => setStaffId(e.target.value)}>
        <option>Seleccionar barbero</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <input
        type="datetime-local"
        className="w-full mb-3 p-2 text-black"
        onChange={(e) => setDate(e.target.value)}
      />

      <textarea
        className="w-full mb-3 p-2 text-black"
        placeholder="Notas"
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        className="bg-green-600 w-full py-2 rounded font-bold"
        onClick={handleSubmit}
      >
        Reservar Cita
      </button>
    </div>
  );
}
