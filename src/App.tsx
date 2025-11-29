
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Reserve from './pages/Reserve'
import Appointments from './pages/Appointments'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-indigo-600">BarberShop</Link>
            <div className="space-x-4">
              <Link to="/" className="hover:text-indigo-600 transition">Inicio</Link>
              <Link to="/reserve" className="hover:text-indigo-600 transition">Reservar</Link>
              <Link to="/appointments" className="hover:text-indigo-600 transition">Citas</Link>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto p-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reserve" element={<Reserve />} />
            <Route path="/appointments" element={<Appointments />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
