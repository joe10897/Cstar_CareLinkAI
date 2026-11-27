/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopPetHeader } from './components/shell/TopPetHeader';
import { BottomTabBar } from './components/shell/BottomTabBar';
import { SystemSnackbar } from './components/overlays/SystemSnackbar';
import { HomeDailyPage } from './pages/HomeDailyPage';
import { FGSScannerPage } from './pages/FGSScannerPage';
import { AIChatTriagePage } from './pages/AIChatTriagePage';
import { TrendsBloodPage } from './pages/TrendsBloodPage';
import { SitterHandoverPage } from './pages/SitterHandoverPage';
import { PetProfilePage } from './pages/PetProfilePage';
import { SitterPortalPage } from './pages/SitterPortalPage';
import { LoginPage } from './pages/LoginPage';
import { BetaFeedbackPage } from './pages/BetaFeedbackPage';
import { AdminFGSDatasetPage } from './pages/AdminFGSDatasetPage';
import { AdminClinicCRMPage } from './pages/AdminClinicCRMPage';
import { AdminBetaAnalyticsPage } from './pages/AdminBetaAnalyticsPage';
import { ShareablePacketPage } from './pages/ShareablePacketPage';
import { carelinkStore, type PetProfile } from './services/carelinkStore';
import { apiClient } from './services/apiClient';
import { useHapticAudio } from './hooks/useHapticAudio';
import { useRealtimeReferrals } from './hooks/useRealtimeReferrals';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <section className="stitch-card" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p className="brand-subtitle mono-val">正在驗證 PetPulse AI 雲端登入工作階段...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, workspaceVersion } = useAuth();
  const {
    hapticEnabled,
    toggleHapticAudio,
    triggerWaterDropTap,
    triggerConfirmChord,
  } = useHapticAudio();
  const { redAlertCount } = useRealtimeReferrals();

  const [pets, setPets] = useState<PetProfile[]>(() => carelinkStore.getPets());
  const [selectedPetId, setSelectedPetId] = useState<string>(
    () => carelinkStore.getPets()[0]?.id || 'pet-miso-001'
  );
  const [snackbar, setSnackbar] = useState<{
    message: string;
    detail?: string;
  } | null>(null);

  useEffect(() => {
    const latestPets = carelinkStore.getPets();
    setPets(latestPets);
    if (latestPets.length > 0 && !latestPets.some((p) => p.id === selectedPetId)) {
      setSelectedPetId(latestPets[0].id);
    }
  }, [workspaceVersion, selectedPetId]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const path = location.pathname;
  const isAdminRoute = path.startsWith('/admin');
  const isLoginRoute = path.startsWith('/login');
  const isFgsRoute = path.startsWith('/app/fgs-scan');

  // Record authenticated page views for 20-30 user beta telemetry
  useEffect(() => {
    if (!isAuthenticated || isLoginRoute) return;
    void apiClient.trackEvent('page_view', path, selectedPet?.id || '');
  }, [isAuthenticated, isLoginRoute, path, selectedPet?.id]);

  const refreshPets = (): void => {
    setPets(carelinkStore.getPets());
  };

  const handleNotify = (message: string, detail?: string): void => {
    setSnackbar({ message, detail });
  };

  const handleSelectPet = (petId: string): void => {
    triggerWaterDropTap();
    setSelectedPetId(petId);
  };

  const renderAdminWorkspace = (child: React.ReactNode): React.ReactNode => (
    <ProtectedRoute>
      <div className="admin-layout-grid">
        <aside className="surface-panel admin-nav-rail" aria-label="獸醫、標註與實測分析後台側欄">
          <h3>PetPulse AI 管理工作台</h3>
          <p className="brand-subtitle">20–30 位用戶實測與臨床後台</p>
          <div className="ledger-list">
            <div className="ledger-row">
              <Link
                to="/admin/beta-analytics"
                className={
                  path.startsWith('/admin/beta-analytics')
                    ? 'btn btn--primary'
                    : 'btn'
                }
              >
                實測用戶數據與匯出中心
              </Link>
            </div>
            <div className="ledger-row">
              <Link
                to="/admin/fgs-dataset"
                className={
                  path.startsWith('/admin/fgs-dataset')
                    ? 'btn btn--primary'
                    : 'btn'
                }
              >
                48 點訓練集標註工作台
              </Link>
            </div>
            <div className="ledger-row">
              <Link
                to="/admin/clinic-crm"
                className={
                  path.startsWith('/admin/clinic-crm')
                    ? 'btn btn--primary'
                    : 'btn'
                }
              >
                合作醫院預審 CRM 看板
              </Link>
            </div>
            <div className="ledger-row">
              <Link to="/app/home" className="btn">
                返回飼主端日常照護
              </Link>
            </div>
          </div>
        </aside>
        <div>{child}</div>
      </div>
    </ProtectedRoute>
  );

  return (
    <div className={isAdminRoute ? 'app-shell app-shell--wide' : 'app-shell app-shell--consumer'}>
      <TopPetHeader
        pets={pets}
        selectedPet={selectedPet}
        onSelectPet={handleSelectPet}
        hapticEnabled={hapticEnabled}
        onToggleHaptic={toggleHapticAudio}
        redAlertCount={redAlertCount}
      />

      <SystemSnackbar
        message={snackbar?.message || null}
        detail={snackbar?.detail}
        onDismiss={() => setSnackbar(null)}
      />

      <main
        className={
          isAdminRoute
            ? 'stitch-viewport stitch-viewport--wide'
            : 'stitch-viewport'
        }
      >
        <div
          className={
            isFgsRoute
              ? 'stitch-main-body stitch-main-body--flush'
              : 'stitch-main-body'
          }
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to={isAuthenticated ? '/app/home' : '/login'} replace />} />
              <Route
                path="/login"
                element={
                  <LoginPage
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/packet/:shareToken"
                element={<ShareablePacketPage />}
              />
              <Route
                path="/app/home"
                element={
                  <ProtectedRoute>
                    <HomeDailyPage
                      selectedPet={selectedPet}
                      hapticEnabled={hapticEnabled}
                      onToggleHaptic={toggleHapticAudio}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/daily"
                element={
                  <ProtectedRoute>
                    <HomeDailyPage
                      selectedPet={selectedPet}
                      hapticEnabled={hapticEnabled}
                      onToggleHaptic={toggleHapticAudio}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/fgs-scan"
                element={
                  <ProtectedRoute>
                    <FGSScannerPage
                      selectedPet={selectedPet}
                      onPetUpdated={refreshPets}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/fgs-scanner"
                element={
                  <ProtectedRoute>
                    <FGSScannerPage
                      selectedPet={selectedPet}
                      onPetUpdated={refreshPets}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/chat"
                element={
                  <ProtectedRoute>
                    <AIChatTriagePage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/trends"
                element={
                  <ProtectedRoute>
                    <TrendsBloodPage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/blood-test"
                element={
                  <ProtectedRoute>
                    <TrendsBloodPage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/sitters"
                element={
                  <ProtectedRoute>
                    <SitterHandoverPage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/sitter"
                element={
                  <ProtectedRoute>
                    <SitterHandoverPage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/clinics"
                element={
                  <ProtectedRoute>
                    <SitterHandoverPage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/profile"
                element={
                  <ProtectedRoute>
                    <PetProfilePage
                      pets={pets}
                      selectedPet={selectedPet}
                      onSelectPet={handleSelectPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/feedback"
                element={
                  <ProtectedRoute>
                    <BetaFeedbackPage
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sitter/portal"
                element={
                  <ProtectedRoute>
                    <SitterPortalPage
                      selectedPet={selectedPet}
                      onTriggerTap={triggerWaterDropTap}
                      onTriggerConfirm={triggerConfirmChord}
                      onNotify={handleNotify}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/beta-analytics"
                element={renderAdminWorkspace(<AdminBetaAnalyticsPage />)}
              />
              <Route
                path="/admin/fgs-dataset"
                element={renderAdminWorkspace(<AdminFGSDatasetPage />)}
              />
              <Route
                path="/admin/clinic-crm"
                element={renderAdminWorkspace(<AdminClinicCRMPage />)}
              />
              <Route path="*" element={<Navigate to={isAuthenticated ? '/app/home' : '/login'} replace />} />
            </Routes>
          </ErrorBoundary>

          {!isLoginRoute && (
            <footer className="compliance-banner">
              <div>
                <strong>PetPulse AI 醫療法規遵循聲明（符合《獸醫師法》規範）</strong>
                <p>
                  本系統提供之臉部 48 點視覺疼痛初篩、紙本血檢 OCR 趨勢與 AI 問診分流，僅供居家健康追蹤與就醫參考，不構成執業獸醫師臨床診斷。
                </p>
              </div>
              <span className="engine-badge mono-val">Cloudflare Workers AI</span>
            </footer>
          )}
        </div>
      </main>

      {isAuthenticated && !isAdminRoute && !isLoginRoute && (
        <BottomTabBar onTriggerTap={triggerWaterDropTap} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
