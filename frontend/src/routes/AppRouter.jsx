import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import TicketDetailPage from '../pages/TicketDetailPage.jsx';
import TechDashboardPage from '../pages/TechDashboardPage.jsx';
import TechTicketDetailPage from '../pages/TechTicketDetailPage.jsx';
import NoticesPage from '../pages/NoticesPage.jsx';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Área do usuário comum */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/tickets/:id" element={
            <ProtectedRoute><TicketDetailPage /></ProtectedRoute>
          } />

          {/* Área do técnico */}
          <Route path="/tech" element={
            <ProtectedRoute roles={['technician', 'admin']}><TechDashboardPage /></ProtectedRoute>
          } />
          <Route path="/tech/tickets/:id" element={
            <ProtectedRoute roles={['technician', 'admin']}><TechTicketDetailPage /></ProtectedRoute>
          } />


          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
