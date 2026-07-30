import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { MainLayout } from '@/components/layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks';

// ── Lazy-Loaded Auth Pages ──
const AuthLayout = lazy(() => import('@/pages/auth/AuthLayout'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));

// ── Lazy-Loaded Application Pages ──
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Trades = lazy(() => import('@/pages/Trades'));
const TradeDetail = lazy(() => import('@/pages/TradeDetail'));
const AddTrade = lazy(() => import('@/pages/AddTrade'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Psychology = lazy(() => import('@/pages/Psychology'));
const RiskCalculator = lazy(() => import('@/pages/RiskCalculator'));
const Journal = lazy(() => import('@/pages/Journal'));
const Playbook = lazy(() => import('@/pages/Playbook'));
const PropFirm = lazy(() => import('@/pages/PropFirm'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Page Fallback Spinner
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
      <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-xs text-text-muted font-medium tracking-wide">Loading module...</span>
    </div>
  );
}

function AppRoutes() {
  useKeyboardShortcuts();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Auth Routes (public) ── */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* ── App Routes (protected) ── */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="trades" element={<Trades />} />
          <Route path="trades/new" element={<AddTrade />} />
          <Route path="trades/:id" element={<TradeDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="psychology" element={<Psychology />} />
          <Route path="risk-calculator" element={<RiskCalculator />} />
          <Route path="journal" element={<Journal />} />
          <Route path="playbook" element={<Playbook />} />
          <Route path="prop-firm" element={<PropFirm />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

/**
 * Root application component.
 * Features Code Splitting, Error Boundaries, Global Shortcuts, Toast Notifications, and Lazy Loading.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1E222D',
              color: '#D1D4DC',
              border: '1px solid #2A2E39',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
            success: {
              iconTheme: { primary: '#26A69A', secondary: '#1E222D' },
            },
            error: {
              iconTheme: { primary: '#EF5350', secondary: '#1E222D' },
            },
          }}
        />

        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
