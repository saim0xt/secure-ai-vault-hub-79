
import React from "react";
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
import PatternLock from "./components/auth/PatternLock";
import VaultDashboard from "./components/vault/VaultDashboard";
import FileManager from "./components/vault/FileManager";
import DuplicateManager from "./components/vault/DuplicateManager";
import Settings from "./components/settings/Settings";
import BiometricSettings from "./components/settings/BiometricSettings";
import AdMobSettings from "./components/settings/AdMobSettings";
import PermissionsManager from "./components/settings/PermissionsManager";
import BreakInLogs from "./components/security/BreakInLogs";
import AIFeatures from "./components/ai/AIFeatures";
import EnhancedAIFeatures from "./components/ai/EnhancedAIFeatures";
import BackupManager from "./components/backup/BackupManager";
import SecureCamera from "./components/camera/SecureCamera";
import VoiceRecorder from "./components/voice/VoiceRecorder";
import RecycleBin from "./components/vault/RecycleBin";
import RewardsCenter from "./components/rewards/RewardsCenter";
import TestingSuite from "./components/testing/TestingSuite";
import LANSyncManager from "./components/network/LANSyncManager";

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
  const { fakeVaultMode } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set status bar style for mobile
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        
        // Configure keyboard
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        
        // Initialize services
        const { DeviceMotionService } = await import('./services/DeviceMotionService');
        const { AdMobService } = await import('./services/AdMobService');
        const { PushNotificationService } = await import('./services/PushNotificationService');
        const { VolumeKeyService } = await import('./services/VolumeKeyService');
        const { BackgroundSecurityService } = await import('./services/BackgroundSecurityService');
        const { NativeSecurityService } = await import('./services/NativeSecurityService');
        const { AutoBackupService } = await import('./services/AutoBackupService');
        const { DialerCodeService } = await import('./services/DialerCodeService');
        const { EnhancedAIService } = await import('./services/EnhancedAIService');
        const { CrossDeviceSyncService } = await import('./services/CrossDeviceSyncService');
        const { AdvancedAnalyticsService } = await import('./services/AdvancedAnalyticsService');
        const { TestingSuiteService } = await import('./services/TestingSuiteService');
        const { PermissionsService } = await import('./services/PermissionsService');
        const { BiometricService } = await import('./services/BiometricService');
        const { LANSyncService } = await import('./services/LANSyncService');
        const { AIProcessingService } = await import('./services/AIProcessingService');
        
        // Initialize all services (order matters for dependencies)
        await PermissionsService.getInstance().initialize();
        await BiometricService.getInstance().checkCapabilities();
        await AIProcessingService.getInstance().loadAPIKeys();
        
        await Promise.all([
          AdMobService.getInstance().initialize(),
          PushNotificationService.getInstance().initialize(),
          VolumeKeyService.getInstance().initialize(),
          BackgroundSecurityService.getInstance().initialize(),
          NativeSecurityService.getInstance().initialize(),
          AutoBackupService.getInstance().initialize(),
          DialerCodeService.getInstance().initialize(),
          EnhancedAIService.getInstance().initialize(),
          CrossDeviceSyncService.getInstance().initialize(),
          AdvancedAnalyticsService.getInstance().initialize(),
          TestingSuiteService.getInstance().initialize(),
          LANSyncService.getInstance().initialize()
        ]);
        
        console.log('Platform and enhanced services initialization successful');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Loading Vaultix...</div>
      </div>
    );
  }

  // Show calculator app if in fake vault mode
  if (fakeVaultMode) {
    const CalculatorApp = React.lazy(() => import('./components/disguise/CalculatorApp'));
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground">Loading...</div>
        </div>
      }>
        <CalculatorApp />
      </React.Suspense>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/pattern-lock" element={<PatternLock onPatternComplete={() => {}} onCancel={() => {}} />} />
        
        {/* Main App Routes */}
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
        <Route path="/duplicates" element={
          <ProtectedRoute>
            <DuplicateManager />
          </ProtectedRoute>
        } />
        <Route path="/recycle-bin" element={
          <ProtectedRoute>
            <RecycleBin />
          </ProtectedRoute>
        } />
        
        {/* Settings Routes */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/biometric-settings" element={
          <ProtectedRoute>
            <BiometricSettings />
          </ProtectedRoute>
        } />
        <Route path="/admob-settings" element={
          <ProtectedRoute>
            <AdMobSettings />
          </ProtectedRoute>
        } />
        <Route path="/permissions" element={
          <ProtectedRoute>
            <PermissionsManager />
          </ProtectedRoute>
        } />
        <Route path="/lan-sync" element={
          <ProtectedRoute>
            <LANSyncManager />
          </ProtectedRoute>
        } />
        
        {/* Security Routes */}
        <Route path="/breakin-logs" element={
          <ProtectedRoute>
            <BreakInLogs />
          </ProtectedRoute>
        } />
        
        {/* AI Routes */}
        <Route path="/ai-features" element={
          <ProtectedRoute>
            <AIFeatures />
          </ProtectedRoute>
        } />
        <Route path="/enhanced-ai" element={
          <ProtectedRoute>
            <EnhancedAIFeatures />
          </ProtectedRoute>
        } />
        
        {/* Feature Routes */}
        <Route path="/rewards" element={
          <ProtectedRoute>
            <RewardsCenter />
          </ProtectedRoute>
        } />
        <Route path="/testing" element={
          <ProtectedRoute>
            <TestingSuite />
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
        
        {/* Fallback */}
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
