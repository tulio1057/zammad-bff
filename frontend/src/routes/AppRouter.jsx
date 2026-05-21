import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import TicketDetailPage from '../pages/TicketDetailPage.jsx';
import TechDashboardPage from '../pages/TechDashboardPage.jsx';
import TechTicketDetailPage from '../pages/TechTicketDetailPage.jsx';
import NoticesPage from '../pages/NoticesPage.jsx';
import AdminReportPage from '../pages/AdminReportPage.jsx';

export default function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Rotas de usuário comum */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />

            {/* Rotas de técnico e admin */}
            <Route path="/tech" element={<ProtectedRoute roles={['technician', 'admin']}><TechDashboardPage /></ProtectedRoute>} />
            <Route path="/tech/tickets/:id" element={<ProtectedRoute roles={['technician', 'admin']}><TechTicketDetailPage /></ProtectedRoute>} />

            {/* Rota exclusiva de admin — dashboard analítico */}
            <Route path="/admin/report" element={<ProtectedRoute roles={['admin']}><AdminReportPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
