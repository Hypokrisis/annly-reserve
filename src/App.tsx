import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Route guards
import { OwnerRoute } from '@/components/auth/OwnerRoute';
import { StaffRoute } from '@/components/auth/StaffRoute';
import { ClientRoute } from '@/components/auth/ClientRoute';
import { AuthOnlyRoute } from '@/components/auth/AuthOnlyRoute';

// Public pages
import Home from './pages/Home';
import BookingPage from './pages/public/BookingPage';
import PricingPage from './pages/PricingPage';
import HowItWorksPage from './pages/HowItWorksPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import AuthRedirectPage from './pages/auth/AuthRedirectPage';

// Owner / Admin dashboard
import DashboardHome from './pages/dashboard/DashboardHome';
import ServicesPage from './pages/dashboard/ServicesPage';
import BarbersPage from './pages/dashboard/BarbersPage';
import SchedulesPage from './pages/dashboard/SchedulesPage';
import AppointmentsPage from './pages/dashboard/AppointmentsPage';
import ClientsPage from './pages/dashboard/ClientsPage';
import CampaignsPage from './pages/dashboard/CampaignsPage';
import BusinessSettingsPage from './pages/dashboard/BusinessSettingsPage';
import AIAssistantPage from './pages/dashboard/AIAssistantPage';
import CreateBusinessPage from './pages/dashboard/CreateBusinessPage';
import SubscriptionPage from './pages/dashboard/SubscriptionPage';

// Staff pages (Phase 4)
import StaffHome from './pages/staff/StaffHome';

// Client pages (Phase 5)
import ClientHome from './pages/client/ClientHome';

export default function App() {
    return (
        <ToastProvider>
            <ThemeProvider>
                <AuthProvider>
                    <BusinessProvider>
                        <Router>
                            <div className="min-h-screen bg-space-bg text-space-text font-sans">
                                <Routes>

                                    {/* ── PUBLIC ─────────────────────────────────── */}
                                    {/* / NEVER redirects — always shows landing */}
                                    <Route path="/" element={<Home />} />
                                    <Route path="/book/:slug" element={<BookingPage />} />
                                    <Route path="/pricing" element={<PricingPage />} />
                                    <Route path="/how-it-works" element={<HowItWorksPage />} />

                                    {/* ── AUTH ───────────────────────────────────── */}
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/signup" element={<SignupPage />} />
                                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                                    {/* Role-based redirect after login */}
                                    <Route path="/auth-redirect" element={<AuthRedirectPage />} />

                                    {/* ── OWNER / ADMIN (/dashboard) ─────────────── */}
                                    <Route path="/dashboard" element={<OwnerRoute><DashboardHome /></OwnerRoute>} />
                                    <Route path="/dashboard/appointments" element={<OwnerRoute><AppointmentsPage /></OwnerRoute>} />
                                    <Route path="/dashboard/clients" element={<OwnerRoute><ClientsPage /></OwnerRoute>} />
                                    <Route path="/dashboard/services" element={<OwnerRoute><ServicesPage /></OwnerRoute>} />
                                    <Route path="/dashboard/barbers" element={<OwnerRoute><BarbersPage /></OwnerRoute>} />
                                    <Route path="/dashboard/schedules" element={<OwnerRoute><SchedulesPage /></OwnerRoute>} />
                                    <Route path="/dashboard/campaigns" element={<OwnerRoute><CampaignsPage /></OwnerRoute>} />
                                    <Route path="/dashboard/ai-assistant" element={<OwnerRoute><AIAssistantPage /></OwnerRoute>} />
                                    <Route path="/dashboard/billing" element={<OwnerRoute><SubscriptionPage /></OwnerRoute>} />
                                    <Route path="/dashboard/settings" element={<OwnerRoute><BusinessSettingsPage /></OwnerRoute>} />
                                    {/* /create-business only needs auth — no business required (new owners) */}
                                    <Route path="/create-business" element={<AuthOnlyRoute><CreateBusinessPage /></AuthOnlyRoute>} />

                                    {/* ── STAFF (/staff) — Phase 4 ──────────────── */}
                                    <Route path="/staff" element={<StaffRoute><StaffHome /></StaffRoute>} />
                                    <Route path="/staff/*" element={<StaffRoute><StaffHome /></StaffRoute>} />

                                    {/* ── CLIENT (/client) — Phase 5 ────────────── */}
                                    <Route path="/client" element={<ClientRoute><ClientHome /></ClientRoute>} />
                                    <Route path="/client/*" element={<ClientRoute><ClientHome /></ClientRoute>} />

                                    {/* ── FALLBACK ───────────────────────────────── */}
                                    <Route path="*" element={<Navigate to="/" replace />} />

                                </Routes>
                            </div>
                        </Router>
                    </BusinessProvider>
                </AuthProvider>
            </ThemeProvider>
        </ToastProvider>
    );
}
