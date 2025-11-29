import { useState, useEffect } from 'react'

function Appointments() {
    const [appointments, setAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchAppointments()
    }, [])

    const fetchAppointments = async () => {
        try {
            setLoading(true)
            const response = await fetch('/.netlify/functions/get-appointments')

            if (!response.ok) {
                throw new Error('Error al cargar las citas')
            }

            const data = await response.json()
            setAppointments(data)
        } catch (error) {
            console.error('Error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDateTime = (datetime) => {
        return new Date(datetime).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="text-xl text-gray-600">Cargando citas...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg">
                Error: {error}
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Lista de Citas</h1>

            {appointments.length === 0 ? (
                <div className="bg-gray-100 text-gray-600 p-8 rounded-lg text-center">
                    No hay citas programadas
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Servicio
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Barbero
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha y Hora
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Notas
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {appointments.map((appointment) => (
                                <tr key={appointment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {appointment.client_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {appointment.service_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {appointment.barber_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDateTime(appointment.datetime)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {appointment.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default Appointments
