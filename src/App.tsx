import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { RequireOwner } from '@/components/auth/RequireOwner';
import { RequireBusiness } from '@/components/auth/RequireBusiness';
import { RequireRole } from '@/components/auth/RequireRole';

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
import BusinessSettingsPage from './pages/dashboard/BusinessSettingsPage';
import CreateBusinessPage from './pages/dashboard/CreateBusinessPage';

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Router>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/reserve" element={<Reserve />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/book/:slug" element={<BookingPage />} />

            {/* AUTH */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* DASHBOARD */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <RequireBusiness>
                      <DashboardHome />
                    </RequireBusiness>
                  </RequireOwner>
                </AuthGuard>
              }
            />

            <Route
              path="/dashboard/services"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <RequireBusiness>
                      <RequireRole requiredRole={['owner', 'admin']}>
                        <ServicesPage />
                      </RequireRole>
                    </RequireBusiness>
                  </RequireOwner>
                </AuthGuard>
              }
            />

            <Route
              path="/dashboard/barbers"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <RequireBusiness>
                      <RequireRole requiredRole={['owner', 'admin']}>
                        <BarbersPage />
                      </RequireRole>
                    </RequireBusiness>
                  </RequireOwner>
                </AuthGuard>
              }
            />

            <Route
              path="/dashboard/schedules"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <RequireBusiness>
                      <RequireRole requiredRole={['owner', 'admin']}>
                        <SchedulesPage />
                      </RequireRole>
                    </RequireBusiness>
                  </RequireOwner>
                </AuthGuard>
              }
            />

            <Route
              path="/dashboard/appointments"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <RequireBusiness>
                      <AppointmentsPage />
                    </RequireBusiness>
                  </RequireOwner>
                </AuthGuard>
              }
            />

            <Route
              path="/dashboard/settings"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <RequireBusiness>
                      <RequireRole requiredRole={['owner', 'admin']}>
                        <BusinessSettingsPage />
                      </RequireRole>
                    </RequireBusiness>
                  </RequireOwner>
                </AuthGuard>
              }
            />

            {/* CREATE BUSINESS */}
            <Route
              path="/create-business"
              element={
                <AuthGuard>
                  <RequireOwner>
                    <CreateBusinessPage />
                  </RequireOwner>
                </AuthGuard>
              }
            />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </BusinessProvider>
    </AuthProvider>
  );
}
