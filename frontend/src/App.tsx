import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { Navbar } from './components/Navbar';
import {
  RedirectIfAuthenticated,
  RequireAdmin,
  RequireAuth,
} from './components/RouteGuards';
import { ToastProvider } from './components/ui/Toast';
import { BuilderRoute } from './pages/BuilderPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminFormsPage } from './pages/admin/AdminFormsPage';
import { AdminFeedbackPage } from './pages/admin/AdminFeedbackPage';
import { ViewFormPage } from './pages/ViewFormPage';
import { useTheme } from './lib/useTheme';

/** Chrome shared by the app pages. Auth screens and the public form opt out. */
function AppLayout({
  theme,
  onToggleTheme,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t px-4 py-6 sm:px-6">
        <div className="text-muted mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-xs sm:flex-row">
          <p>FormCraft — React 19, TypeScript, Tailwind CSS, Express and MongoDB.</p>
          <p>Sessions are stored in httpOnly cookies.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public form — standalone, reachable by anyone with the link. */}
            <Route path="/form/:formId" element={<ViewFormPage />} />

            {/* Auth screens — bounce signed-in users to their dashboard. */}
            <Route element={<RedirectIfAuthenticated />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<AppLayout theme={theme} onToggleTheme={toggleTheme} />}>
              <Route path="/" element={<LandingPage />} />

              {/* Everything below needs a signed-in user. */}
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/builder" element={<BuilderRoute />} />
                <Route path="/builder/:formId" element={<BuilderRoute />} />
                <Route path="/forms/:formId/responses" element={<ResponsesPage />} />
              </Route>

              {/* Admin panel — role checked on the client and on every API call. */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/forms" element={<AdminFormsPage />} />
                <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
