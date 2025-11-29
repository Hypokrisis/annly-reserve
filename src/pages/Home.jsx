import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">
        Bienvenido a BarberShop
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        Reserva tu cita con los mejores barberos de la ciudad.
        Servicio profesional, atención personalizada.
      </p>
      <button
        onClick={() => navigate('/reserve')}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
      >
        Reservar Ahora
      </button>
    </div>
  )
}

export default Home
