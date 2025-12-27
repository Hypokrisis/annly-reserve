import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
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
import CreateBusinessPage from './pages/dashboard/CreateBusinessPage';
import BusinessSettingsPage from './pages/dashboard/BusinessSettingsPage';

const RootRedirect = () => {
  const { user, loading, businesses, isEmailConfirmed } = useAuth();

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Not authenticated -> go to home
  if (!user) {
    return <Navigate to="/home" replace />;
  }

  // Authenticated but email not confirmed -> ProtectedRoute will handle this
  // Redirect to dashboard and let ProtectedRoute show the confirmation message
  if (!isEmailConfirmed) {
    return <Navigate to="/dashboard" replace />;
  }

  // Authenticated and confirmed but no businesses -> still go to dashboard
  // (This shouldn't happen with the trigger, but we handle it gracefully)
  // Authenticated and confirmed but no businesses
  if (businesses.length === 0) {
    // Check user intention from signup
    const intendedRole = localStorage.getItem('intended_role');

    if (intendedRole === 'owner') {
      return <Navigate to="/create-business" replace />;
    }

    // Default behavior for Clients: Go to Home
    return <Navigate to="/home" replace />;
  }

  // Fully authenticated with business -> go to dashboard
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/home" element={<Home />} />
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
              <Route
                path="/dashboard/settings"
                element={
                  <ProtectedRoute requiredRole={['owner', 'admin']}>
                    <BusinessSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Create Business route (for users without business) */}
              <Route path="/create-business" element={<CreateBusinessPage />} />

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
