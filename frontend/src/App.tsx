import React from 'react';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountPage from './pages/AccountPage';
import ProductPage from './pages/ProductPage';
import SolutionsPage from './pages/SolutionsPage';
import ResourcesPage from './pages/ResourcesPage';
import CustomersPage from './pages/CustomersPage';
import PricingPage from './pages/PricingPage';
import AddMedicationPage from './pages/AddMedicationPage';
import { useAuth } from './hooks/useAuth';
import { useDashboardNav } from './hooks/useDashboardNav';
import { useMedications } from './hooks/useMedications';
import { useNavigateWithAuthMode } from './hooks/useNavigateWithAuthMode';
import { useQrModal } from './hooks/useQrModal';
import { useRouting } from './hooks/useRouting';
import { useToast } from './hooks/useToast';

const App: React.FC = () => {
    const { route, navigate, requiresAuth } = useRouting();
    const { toast, setToast } = useToast();
    const {
        authToken,
        authMode,
        setAuthMode,
        loginForm,
        authError,
        profile,
        profileForm,
        profileError,
        profileSaving,
        adminUsers,
        adminError,
        adminLoading,
        authFetch,
        loadAdminUsers,
        handleLoginFormChange,
        handleProfileFormChange,
        handleToggleAuthMode,
        handleLogin,
        handleSignup,
        handleLogout,
        handleProfileSave
    } = useAuth({ requiresAuth, navigate, setToast });
    const onNavigate = useNavigateWithAuthMode(navigate, setAuthMode);
    const { activeTab, handleNavSelect } = useDashboardNav(navigate);
    const {
        medications,
        filteredMedications,
        isLoading,
        isSubmitting,
        error,
        addError,
        searchQuery,
        lastUpdated,
        lookupSerial,
        lookupResult,
        lookupError,
        lookupLoading,
        formData,
        fetchMedications,
        setSearchQuery,
        setLookupSerial,
        handleInputChange,
        handleSubmit,
        handleLookup
    } = useMedications({ authFetch, route, activeTab, setToast });
    const { showQRModal, selectedQRHash, copied, handleShowQR, handleCopyHash, closeQrModal } = useQrModal(setToast);

    const marketingPages: Record<string, JSX.Element> = {
        '/': <HomePage authToken={authToken} onNavigate={onNavigate} />,
        '/product': <ProductPage authToken={authToken} onNavigate={onNavigate} />,
        '/solutions': <SolutionsPage authToken={authToken} onNavigate={onNavigate} />,
        '/resources': <ResourcesPage authToken={authToken} onNavigate={onNavigate} />,
        '/customers': <CustomersPage authToken={authToken} onNavigate={onNavigate} />,
        '/pricing': <PricingPage authToken={authToken} onNavigate={onNavigate} />
    };

    const showDashboard = route === '/app' && !!authToken;
    const showAddMedication = route === '/app/add' && !!authToken;
    const showAccount = route === '/account' && !!authToken;
    const showLogin = route === '/login' || (!authToken && requiresAuth);
    const showMarketing = !showDashboard && !showAddMedication && !showLogin && !showAccount;
    const marketingPage = marketingPages[route] ?? marketingPages['/'];

    return (
        <div className="app">
            <div className="app__glow app__glow--one" />
            <div className="app__glow app__glow--two" />


            {/* Legacy topbar removed; homepage and dashboard have their own nav */} 

            {showMarketing && marketingPage}

            {showLogin && (
                <LoginPage
                    authMode={authMode}
                    loginForm={loginForm}
                    authError={authError}
                    onLoginFormChange={handleLoginFormChange}
                    onToggleMode={handleToggleAuthMode}
                    onSubmitLogin={handleLogin}
                    onSubmitSignup={handleSignup}
                    onNavigateHome={() => onNavigate('/')}
                />
            )}

            {showDashboard && (
                <DashboardPage
                    userName={profile?.username || 'User'}
                    onAccountClick={() => navigate('/account')}
                    activeNav={activeTab}
                    onNavSelect={handleNavSelect}
                    medications={medications}
                    filteredMedications={filteredMedications}
                    isLoading={isLoading}
                    error={error}
                    onRefresh={fetchMedications}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    lastUpdated={lastUpdated}
                    onShowQR={handleShowQR}
                    lookupSerial={lookupSerial}
                    onLookupSerialChange={setLookupSerial}
                    onLookup={handleLookup}
                    lookupLoading={lookupLoading}
                    lookupError={lookupError}
                    lookupResult={lookupResult}
                />
            )}

            {showAddMedication && (
                <AddMedicationPage
                    userName={profile?.username || 'User'}
                    onAccountClick={() => navigate('/account')}
                    activeNav="add"
                    onNavSelect={handleNavSelect}
                    formData={formData}
                    onInputChange={handleInputChange}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    addError={addError}
                />
            )}

            {showAccount && (
                <AccountPage
                    profile={profile}
                    profileForm={profileForm}
                    profileError={profileError}
                    profileSaving={profileSaving}
                    onProfileFormChange={handleProfileFormChange}
                    onProfileSave={handleProfileSave}
                    onBack={() => navigate('/app')}
                    onLogout={handleLogout}
                    adminUsers={adminUsers}
                    adminLoading={adminLoading}
                    adminError={adminError}
                    onReloadAdmin={loadAdminUsers}
                />
            )}

            {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}

            {showQRModal && (
                <div className="modal" onClick={closeQrModal}>
                    <div className="modal__card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <div>
                                <h3>QR Payload</h3>
                                <p>Scan-ready hash for supply chain validation.</p>
                            </div>
                            <button className="button button--ghost button--mini" onClick={handleCopyHash}>
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy hash'}
                            </button>
                        </div>
                        <div className="modal__body">
                            <QRCodeSVG value={selectedQRHash} size={220} />
                            <p className="hash">{selectedQRHash}</p>
                        </div>
                    </div>
                </div>
            )}

            <footer className="footer">
                <span>LedgRx • Private pharma traceability</span>
                <span>Powered by Hyperledger Fabric</span>
            </footer>
        </div>
    );
};

export default App;
