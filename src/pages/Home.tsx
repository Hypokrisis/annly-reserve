import { Calendar, Clock, CheckCircle } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Calendar,
      title: 'Reserva Fácil',
      description: 'Selecciona tu fecha y hora preferida de manera rápida y sencilla',
    },
    {
      icon: Clock,
      title: 'Disponibilidad en Tiempo Real',
      description: 'Consulta horarios disponibles actualizados al instante',
    },
    {
      icon: CheckCircle,
      title: 'Confirmación Inmediata',
      description: 'Recibe confirmación de tu reserva al momento',
    },
  ];

  return (
    <div className="flex-1">
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Reserva tu cita en segundos
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Sistema de reservas inteligente que simplifica la gestión de tus citas
            </p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
              Hacer una reserva
            </button>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ¿Por qué elegirnos?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow"
                >
                  <div className="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            ¿Listo para comenzar?
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Únete a miles de usuarios que ya confían en nuestro sistema
          </p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
            Crear cuenta
          </button>
        </div>
      </section>
    </div>
  );
}
