
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { VaultProvider } from '@/contexts/VaultContext';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

// Pages
import AuthPage from '@/pages/AuthPage';
import VaultDashboard from '@/components/vault/VaultDashboard';
import SecurityCenterPage from '@/pages/SecurityCenterPage';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" />;
};

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <VaultDashboard />
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute>
            <SecurityCenterPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VaultProvider>
          <AppContent />
          <Toaster />
        </VaultProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
