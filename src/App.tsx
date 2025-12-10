import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Reserve from './pages/Reserve';
import Appointments from './pages/Appointments';
import BookingPage from './pages/public/BookingPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard pages
import DashboardHome from './pages/dashboard/DashboardHome';
import ServicesPage from './pages/dashboard/ServicesPage';
import BarbersPage from './pages/dashboard/BarbersPage';
import SchedulesPage from './pages/dashboard/SchedulesPage';
import AppointmentsPage from './pages/dashboard/AppointmentsPage';

function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/reserve" element={<Reserve />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/book/:slug" element={<BookingPage />} />

              {/* Auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/services"
                element={
                  <ProtectedRoute requiredRole={['owner', 'admin']}>
                    <ServicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/barbers"
                element={
                  <ProtectedRoute requiredRole={['owner', 'admin']}>
                    <BarbersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/schedules"
                element={
                  <ProtectedRoute requiredRole={['owner', 'admin']}>
                    <SchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/appointments"
                element={
                  <ProtectedRoute>
                    <AppointmentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </BusinessProvider>
    </AuthProvider>
  );
}

export default App;
