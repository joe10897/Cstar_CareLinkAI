/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
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
import { AdminFGSDatasetPage } from './pages/AdminFGSDatasetPage';
import { AdminClinicCRMPage } from './pages/AdminClinicCRMPage';
import { ShareablePacketPage } from './pages/ShareablePacketPage';
import { carelinkStore, type PetProfile } from './services/carelinkStore';
import { useHapticAudio } from './hooks/useHapticAudio';
import { useRealtimeReferrals } from './hooks/useRealtimeReferrals';

const AppLayout: React.FC = () => {
  const location = useLocation();
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

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const path = location.pathname;
  const isAdminRoute = path.startsWith('/admin');
  const isLoginRoute = path.startsWith('/login');
  const isFgsRoute = path.startsWith('/app/fgs-scan');

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
    <div className="admin-layout-grid">
      <aside className="surface-panel admin-nav-rail" aria-label="獸醫與標註員後台側欄">
        <h3>PetPulse AI 臨床工作台</h3>
        <p className="brand-subtitle">280px 固定桌面端導覽側欄</p>
        <div className="ledger-list">
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
              <Route path="/" element={<Navigate to="/app/home" replace />} />
              <Route
                path="/app/home"
                element={
                  <HomeDailyPage
                    selectedPet={selectedPet}
                    hapticEnabled={hapticEnabled}
                    onToggleHaptic={toggleHapticAudio}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/daily"
                element={
                  <HomeDailyPage
                    selectedPet={selectedPet}
                    hapticEnabled={hapticEnabled}
                    onToggleHaptic={toggleHapticAudio}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/fgs-scan"
                element={
                  <FGSScannerPage
                    selectedPet={selectedPet}
                    onPetUpdated={refreshPets}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/fgs-scanner"
                element={
                  <FGSScannerPage
                    selectedPet={selectedPet}
                    onPetUpdated={refreshPets}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/chat"
                element={
                  <AIChatTriagePage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/trends"
                element={
                  <TrendsBloodPage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/blood-test"
                element={
                  <TrendsBloodPage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/sitters"
                element={
                  <SitterHandoverPage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/sitter"
                element={
                  <SitterHandoverPage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/clinics"
                element={
                  <SitterHandoverPage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/app/profile"
                element={
                  <PetProfilePage
                    pets={pets}
                    selectedPet={selectedPet}
                    onSelectPet={handleSelectPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
              <Route
                path="/sitter/portal"
                element={
                  <SitterPortalPage
                    selectedPet={selectedPet}
                    onTriggerTap={triggerWaterDropTap}
                    onTriggerConfirm={triggerConfirmChord}
                    onNotify={handleNotify}
                  />
                }
              />
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
                path="/admin/fgs-dataset"
                element={renderAdminWorkspace(<AdminFGSDatasetPage />)}
              />
              <Route
                path="/admin/clinic-crm"
                element={renderAdminWorkspace(<AdminClinicCRMPage />)}
              />
              <Route
                path="/packet/:shareToken"
                element={<ShareablePacketPage />}
              />
              <Route path="*" element={<Navigate to="/app/home" replace />} />
            </Routes>
          </ErrorBoundary>

          {!isLoginRoute && (
            <footer className="compliance-banner">
              <div>
                <strong>PetPulse AI 醫療法規遵循聲明（符合《獸醫師法》規範）</strong>
                <p>
                  本系統提供之貓臉 48 點無尺度幾何指標與紙本血檢 OCR 趨勢，僅供居家健康追蹤與就醫分流導引，不構成獸醫師臨床診斷。
                </p>
              </div>
              <span className="engine-badge mono-val">Pulse Engine 2.4</span>
            </footer>
          )}
        </div>
      </main>

      {!isAdminRoute && !isLoginRoute && (
        <BottomTabBar onTriggerTap={triggerWaterDropTap} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;
