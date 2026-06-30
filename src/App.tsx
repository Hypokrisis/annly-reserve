import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Route guards (small, always needed — keep static)
import { OwnerRoute } from '@/components/auth/OwnerRoute';
import { StaffRoute } from '@/components/auth/StaffRoute';
import { AuthOnlyRoute } from '@/components/auth/AuthOnlyRoute';
import { ClientRoute } from '@/components/auth/ClientRoute';

// Public pages — lazy so each route is its own chunk and heavy deps
// (leaflet maps, image cropper, dashboard) load only when visited.
const Home = lazy(() => import('./pages/Home'));
const BookingPage = lazy(() => import('./pages/public/BookingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const SuperAdminLoginPage = lazy(() => import('./pages/SuperAdminLoginPage'));

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'));
const AuthRedirectPage = lazy(() => import('./pages/auth/AuthRedirectPage'));
const JoinPage = lazy(() => import('./pages/auth/JoinPage'));

// Public pages
const CancelPage = lazy(() => import('./pages/public/CancelPage'));
const BusinessProfilePage = lazy(() => import('./pages/public/BusinessProfilePage'));
const MisCitasTokenPage = lazy(() => import('./pages/public/MisCitasTokenPage'));
const RegisterClientPage = lazy(() => import('./pages/public/RegisterClientPage'));

// Client area
const ClientHome = lazy(() => import('./pages/client/ClientHome'));

// Owner / Admin dashboard
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const ServicesPage = lazy(() => import('./pages/dashboard/ServicesPage'));
const BarbersPage = lazy(() => import('./pages/dashboard/BarbersPage'));
const SchedulesPage = lazy(() => import('./pages/dashboard/SchedulesPage'));
const AppointmentsPage = lazy(() => import('./pages/dashboard/AppointmentsPage'));
const ClientsPage = lazy(() => import('./pages/dashboard/ClientsPage'));
const CampaignsPage = lazy(() => import('./pages/dashboard/CampaignsPage'));
const BusinessSettingsPage = lazy(() => import('./pages/dashboard/BusinessSettingsPage'));
const AIAssistantPage = lazy(() => import('./pages/dashboard/AIAssistantPage'));
const CreateBusinessPage = lazy(() => import('./pages/dashboard/CreateBusinessPage'));
const SubscriptionPage = lazy(() => import('./pages/dashboard/SubscriptionPage'));
const TeamPage = lazy(() => import('./pages/dashboard/TeamPage'));

// Staff pages (Phase 4)
const StaffHome = lazy(() => import('./pages/staff/StaffHome'));

function PageFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <LoadingSpinner />
        </div>
    );
}

export default function App() {
    return (
        <ToastProvider>
            <ThemeProvider>
                <AuthProvider>
                    <BusinessProvider>
                        <Router>
                            <div className="min-h-screen bg-space-bg text-space-text font-sans">
                                <Suspense fallback={<PageFallback />}>
                                    <Routes>

                                        {/* ── PUBLIC ─────────────────────────────────── */}
                                        {/* / NEVER redirects — always shows landing */}
                                        <Route path="/" element={<Home />} />
                                        <Route path="/business/:slug" element={<BusinessProfilePage />} />
                                        <Route path="/book/:slug" element={<BookingPage />} />
                                        <Route path="/pricing" element={<PricingPage />} />
                                        <Route path="/how-it-works" element={<HowItWorksPage />} />
                                        <Route path="/terms" element={<TermsPage />} />
                                        <Route path="/privacy" element={<PrivacyPage />} />

                                        {/* ── AUTH ───────────────────────────────────── */}
                                        <Route path="/login" element={<LoginPage />} />
                                        <Route path="/register" element={<RegisterPage />} />
                                        <Route path="/register-client" element={<RegisterClientPage />} />
                                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                        <Route path="/auth/callback" element={<AuthCallbackPage />} />
                                        <Route path="/auth-redirect" element={<AuthRedirectPage />} />
                                        <Route path="/cancel/:token" element={<CancelPage />} />
                                        <Route path="/mis-citas/:token" element={<MisCitasTokenPage />} />
                                        <Route path="/join" element={<JoinPage />} />

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
                                        <Route path="/dashboard/team" element={<OwnerRoute><TeamPage /></OwnerRoute>} />
                                        {/* /create-business only needs auth — no business required (new owners) */}
                                        <Route path="/create-business" element={<AuthOnlyRoute><CreateBusinessPage /></AuthOnlyRoute>} />

                                        {/* ── STAFF (/staff) — Phase 4 ──────────────── */}
                                        <Route path="/staff" element={<StaffRoute><StaffHome /></StaffRoute>} />
                                        <Route path="/staff/*" element={<StaffRoute><StaffHome /></StaffRoute>} />

                                        {/* ── CLIENT (/client) — panel del cliente registrado ── */}
                                        <Route path="/client" element={<ClientRoute><ClientHome /></ClientRoute>} />
                                        <Route path="/client/*" element={<Navigate to="/client" replace />} />

                                        {/* ── SUPERADMIN ─────────────────────────────── */}
                                        <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
                                        <Route path="/superadmin" element={<SuperAdminPage />} />

                                        {/* ── FALLBACK ───────────────────────────────── */}
                                        <Route path="*" element={<Navigate to="/" replace />} />

                                    </Routes>
                                </Suspense>
                            </div>
                        </Router>
                    </BusinessProvider>
                </AuthProvider>
            </ThemeProvider>
        </ToastProvider>
    );
}
