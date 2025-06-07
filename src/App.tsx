import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

// Components
import AuthScreen from "./components/auth/AuthScreen";
import VaultDashboard from "./components/vault/VaultDashboard";
import FileManager from "./components/vault/FileManager";
import Settings from "./components/settings/Settings";
import BreakInLogs from "./components/security/BreakInLogs";
import AIFeatures from "./components/ai/AIFeatures";
import BackupManager from "./components/backup/BackupManager";
import SecureCamera from "./components/camera/SecureCamera";
import VoiceRecorder from "./components/voice/VoiceRecorder";
import RecycleBin from "./components/vault/RecycleBin";

// Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { VaultProvider } from "./contexts/VaultContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SecurityProvider } from "./contexts/SecurityContext";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set status bar style for mobile
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        
        // Configure keyboard
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        
        console.log('Platform initialization successful');
      } catch (error) {
        console.log('Platform initialization failed (running in web):', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading Vaultix...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/" element={
          <ProtectedRoute>
            <VaultDashboard />
          </ProtectedRoute>
        } />
        <Route path="/files" element={
          <ProtectedRoute>
            <FileManager />
          </ProtectedRoute>
        } />
        <Route path="/files/:folderId" element={
          <ProtectedRoute>
            <FileManager />
          </ProtectedRoute>
        } />
        <Route path="/recycle-bin" element={
          <ProtectedRoute>
            <RecycleBin />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/breakin-logs" element={
          <ProtectedRoute>
            <BreakInLogs />
          </ProtectedRoute>
        } />
        <Route path="/ai-features" element={
          <ProtectedRoute>
            <AIFeatures />
          </ProtectedRoute>
        } />
        <Route path="/backup" element={
          <ProtectedRoute>
            <BackupManager />
          </ProtectedRoute>
        } />
        <Route path="/camera" element={
          <ProtectedRoute>
            <SecureCamera />
          </ProtectedRoute>
        } />
        <Route path="/voice-recorder" element={
          <ProtectedRoute>
            <VoiceRecorder />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SecurityProvider>
        <AuthProvider>
          <VaultProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </VaultProvider>
        </AuthProvider>
      </SecurityProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
