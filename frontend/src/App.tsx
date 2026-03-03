import React from 'react';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';
import HomePage from './pages/HomePage';
import OrgLoginPage from './pages/OrgLoginPage';
import OrgSignupPage from './pages/OrgSignupPage';
import WorkerLoginPage from './pages/WorkerLoginPage';
import OrgDashboardPage from './pages/OrgDashboardPage';
import DashboardPage from './pages/DashboardPage';
import AccountPage from './pages/AccountPage';
import ProductPage from './pages/ProductPage';
import SolutionsPage from './pages/SolutionsPage';
import ResourcesPage from './pages/ResourcesPage';
import CustomersPage from './pages/CustomersPage';
import PricingPage from './pages/PricingPage';
import PolicyPage from './pages/PolicyPage';
import AddMedicationPage from './pages/AddMedicationPage';
import AdminSetupPage from './pages/AdminSetupPage';
import AdminPage from './pages/AdminPage';
import OnboardingPage from './pages/OnboardingPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import PlatformLoginPage from './pages/PlatformLoginPage';
import MarketingFooter from './components/MarketingFooter';
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
        setAuthMode,
        profile,
        profileForm,
        profileError,
        profileSaving,
        authFetch,
        handleProfileFormChange,
        handleLogout,
        handleProfileSave,
        requestEmailChange,
        bootstrapAdmin,
        platformLogin,
        orgLogin,
        workerLogin,
        handleOrgSignup,
        adminOrgs,
        adminOrgsLoading,
        adminOrgsError,
        loadAdminOrgs,
        approveOrg,
        rejectOrg,
        deleteOrg,
        updateOrg,
        resetOrgPassword,
        loadAdminOrgWorkers,
        deleteAdminOrgWorker,
        resetAdminOrgWorkerPassword,
        orgWorkers,
        orgWorkersLoading,
        orgWorkersError,
        loadOrgWorkers,
        addOrgWorker,
        removeOrgWorker,
        updateOrgWorkerJobTitle,
        bulkAddWorkers
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
        lookupAudit,
        formData,
        receiveSerial,
        receiveLoading,
        receiveError,
        arrivedSerial,
        arrivedLoading,
        arrivedError,
        receiveBatch,
        arrivedBatch,
        batchReceiveLoading,
        batchReceiveError,
        batchReceiveResults,
        batchArrivedLoading,
        batchArrivedError,
        batchArrivedResults,
        fetchMedications,
        setSearchQuery,
        setLookupSerial,
        handleInputChange,
        handleSubmit,
        handleLookup,
        setReceiveSerial,
        setArrivedSerial,
        handleMarkReceived,
        handleMarkArrived,
        addToReceiveBatch,
        removeFromReceiveBatch,
        clearReceiveBatch,
        handleBatchReceived,
        addToArrivedBatch,
        removeFromArrivedBatch,
        clearArrivedBatch,
        handleBatchArrived,
        bulkAddMedications,
        resolveQrHash
    } = useMedications({ authFetch, route, activeTab, setToast });
    const { showQRModal, selectedQRHash, copied, handleShowQR, handleCopyHash, closeQrModal } = useQrModal(setToast);

    const marketingPages: Record<string, JSX.Element> = {
        '/': <HomePage authToken={authToken} onNavigate={onNavigate} />,
        '/product': <ProductPage authToken={authToken} onNavigate={onNavigate} />,
        '/solutions': <SolutionsPage authToken={authToken} onNavigate={onNavigate} />,
        '/resources': <ResourcesPage authToken={authToken} onNavigate={onNavigate} />,
        '/customers': <CustomersPage authToken={authToken} onNavigate={onNavigate} />,
        '/pricing': <PricingPage authToken={authToken} onNavigate={onNavigate} />,
        '/iso-compliance': (
            <PolicyPage
                authToken={authToken}
                onNavigate={onNavigate}
                eyebrow="Compliance"
                title="ISO compliance framework"
                intro="LedgRx aligns private blockchain operations with quality and security control expectations for regulated pharma distribution workflows."
                points={[
                    'Operational controls mapped to documented quality procedures.',
                    'Access control, audit logging, and record retention by default.',
                    'Continuous review process for control effectiveness and updates.'
                ]}
            />
        ),
        '/governance-standards': (
            <PolicyPage
                authToken={authToken}
                onNavigate={onNavigate}
                eyebrow="Governance"
                title="Governance standards"
                intro="Our governance model defines ownership, change control, and accountability across organizations participating in the LedgRx network."
                points={[
                    'Defined roles for administrators, operators, and compliance teams.',
                    'Formal change approval for chaincode, API, and infrastructure updates.',
                    'Traceable decision records for policy and operational exceptions.'
                ]}
            />
        ),
        '/service-level-agreement': (
            <PolicyPage
                authToken={authToken}
                onNavigate={onNavigate}
                eyebrow="Service"
                title="Service level agreement"
                intro="LedgRx service commitments cover platform uptime, support response windows, incident handling, and recovery objectives."
                points={[
                    'Availability targets and planned maintenance communication policy.',
                    'Severity-based response and escalation timelines.',
                    'Incident reporting, postmortem process, and remediation tracking.'
                ]}
            />
        ),
        '/user-data': (
            <PolicyPage
                authToken={authToken}
                onNavigate={onNavigate}
                eyebrow="Data"
                title="User data handling"
                intro="LedgRx limits and protects user data through strict access controls, minimization practices, and auditable processing workflows."
                points={[
                    'Least-privilege access for personnel and service accounts.',
                    'Data minimization and purpose-bound processing standards.',
                    'Retention windows and secure deletion procedures.'
                ]}
            />
        ),
        '/privacy-security': (
            <PolicyPage
                authToken={authToken}
                onNavigate={onNavigate}
                eyebrow="Security"
                title="Privacy and security controls"
                intro="Security controls are built around private-network architecture, strong credential governance, and continuous monitoring."
                points={[
                    'Private blockchain topology with restricted network exposure.',
                    'Credential lifecycle management and rotation requirements.',
                    'Monitoring, alerting, and anomaly response playbooks.'
                ]}
            />
        ),
        '/data-governance': (
            <PolicyPage
                authToken={authToken}
                onNavigate={onNavigate}
                eyebrow="Governance"
                title="Data governance"
                intro="LedgRx establishes clear ownership for data quality, lineage, and stewardship across manufacturers, distributors, and care providers."
                points={[
                    'Data ownership and stewardship responsibilities by role.',
                    'Validation controls for critical medication traceability fields.',
                    'End-to-end lineage expectations for compliance and reporting.'
                ]}
            />
        )
    };

    const profileType = profile?.type;
    // Org admins and workers always have companyType set, so profileIncomplete only applies to legacy users
    const profileIncomplete = !!authToken && profile !== null && !profile.companyType && profileType !== 'org' && profileType !== 'worker';
    const approvalStatus = profile?.approvalStatus || 'approved';
    const isPendingApproval = !!authToken && profile !== null && !profileIncomplete
        && approvalStatus !== 'approved' && !profile.isAdmin;
    const showSetup = route === '/setup';
    const showOrgSignup = route === '/signup' && !authToken;
    const showOrgLogin = route === '/login/org' && !authToken;
    const showWorkerLogin = route === '/login/worker' && !authToken;
    const showOrgDashboard = route === '/org' && !!authToken && profileType === 'org' && approvalStatus === 'approved';
    const showOrgPending = route === '/org' && !!authToken && profileType === 'org' && approvalStatus !== 'approved';
    const showOnboarding = profileIncomplete && (route === '/app' || route === '/app/add' || route === '/account');
    const showPendingApproval = isPendingApproval && (route === '/app' || route === '/app/add' || route === '/account' || route === '/org');
    const showDashboard = route === '/app' && !!authToken && !profileIncomplete && !isPendingApproval && profileType !== 'org';
    const showAddMedication = route === '/app/add' && !!authToken && !profileIncomplete && !isPendingApproval && profileType !== 'org';
    const showAccount = route === '/account' && !!authToken && !profileIncomplete && !isPendingApproval;
    const showAdmin = route === '/app/admin' && !!authToken && !profileIncomplete && !isPendingApproval;
    const showPlatformLogin = route === '/staff-a7f3' && !authToken;
    const showLogin = false; // old /login redirected below
    // Redirect bare /login to org login
    if (route === '/login' && !authToken) {
        navigate('/login/org');
    }

    const showMarketing = !showDashboard && !showAddMedication && !showLogin && !showAccount && !showOnboarding
        && !showPendingApproval && !showSetup && !showAdmin && !showOrgDashboard && !showOrgPending
        && !showOrgSignup && !showOrgLogin && !showWorkerLogin && !showPlatformLogin;
    const marketingPage = marketingPages[route] ?? marketingPages['/'];

    const companyType = (profile?.companyType || '').toLowerCase();
    const canAdd = companyType === 'production';
    const canReceive = companyType === 'distribution';
    const canArrived = companyType === 'pharmacy' || companyType === 'clinic';

    return (
        <div className="app">
            <div className="app__glow app__glow--one" />
            <div className="app__glow app__glow--two" />


            {/* Legacy topbar removed; homepage and dashboard have their own nav */} 

            {showMarketing && (
                <>
                    {marketingPage}
                    <MarketingFooter onNavigate={onNavigate} />
                </>
            )}

            {showOrgSignup && (
                <OrgSignupPage
                    onSignup={async (data) => {
                        await handleOrgSignup(data);
                        navigate('/org');
                    }}
                    onNavigateHome={() => navigate('/')}
                    onNavigateLogin={() => navigate('/login/org')}
                />
            )}

            {showOrgLogin && (
                <OrgLoginPage
                    onLogin={async (username, password) => {
                        await orgLogin(username, password);
                        navigate('/org');
                    }}
                    onNavigateHome={() => navigate('/')}
                    onNavigateSignup={() => navigate('/signup')}
                    onNavigateWorkerLogin={() => navigate('/login/worker')}
                />
            )}

            {showWorkerLogin && (
                <WorkerLoginPage
                    onLogin={async (username, password) => {
                        await workerLogin(username, password);
                        navigate('/app');
                    }}
                    onNavigateHome={() => navigate('/')}
                    onNavigateOrgLogin={() => navigate('/login/org')}
                />
            )}

            {(showPendingApproval || showOrgPending) && (
                <PendingApprovalPage
                    status={approvalStatus === 'rejected' ? 'rejected' : 'pending'}
                    onLogout={handleLogout}
                />
            )}

            {showOnboarding && (
                <OnboardingPage
                    profileForm={profileForm}
                    profileError={profileError}
                    profileSaving={profileSaving}
                    onProfileFormChange={handleProfileFormChange}
                    onProfileSave={handleProfileSave}
                />
            )}

            {showSetup && (
                <AdminSetupPage
                    onBootstrap={async (username, password) => {
                        await bootstrapAdmin(username, password);
                        navigate('/app');
                    }}
                    onNavigateLogin={() => navigate('/login')}
                />
            )}

            {showPlatformLogin && (
                <PlatformLoginPage
                    onLogin={async (username, password) => {
                        await platformLogin(username, password);
                        navigate('/app');
                    }}
                />
            )}

            {showOrgDashboard && profile && (
                <OrgDashboardPage
                    profile={profile}
                    orgWorkers={orgWorkers}
                    orgWorkersLoading={orgWorkersLoading}
                    orgWorkersError={orgWorkersError}
                    onLoadWorkers={loadOrgWorkers}
                    onAddWorker={addOrgWorker}
                    onRemoveWorker={removeOrgWorker}
                    onUpdateJobTitle={updateOrgWorkerJobTitle}
                    onBulkAddWorkers={bulkAddWorkers}
                    onLogout={handleLogout}
                    onAccountClick={() => navigate('/account')}
                />
            )}

            {showDashboard && (
                <DashboardPage
                    userName={profile?.username || 'User'}
                    onAccountClick={() => navigate('/account')}
                    activeNav={activeTab}
                    onNavSelect={handleNavSelect}
                    isAdmin={!!profile?.isAdmin}
                    canAdd={canAdd}
                    canReceive={canReceive}
                    canArrived={canArrived}
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
                    lookupAudit={lookupAudit}
                    receiveSerial={receiveSerial}
                    receiveLoading={receiveLoading}
                    receiveError={receiveError}
                    onReceiveSerialChange={setReceiveSerial}
                    onMarkReceived={handleMarkReceived}
                    arrivedSerial={arrivedSerial}
                    arrivedLoading={arrivedLoading}
                    arrivedError={arrivedError}
                    onArrivedSerialChange={setArrivedSerial}
                    onMarkArrived={handleMarkArrived}
                    receiveBatch={receiveBatch}
                    batchReceiveLoading={batchReceiveLoading}
                    batchReceiveError={batchReceiveError}
                    batchReceiveResults={batchReceiveResults}
                    onAddToReceiveBatch={addToReceiveBatch}
                    onRemoveFromReceiveBatch={removeFromReceiveBatch}
                    onClearReceiveBatch={clearReceiveBatch}
                    onBatchReceived={handleBatchReceived}
                    arrivedBatch={arrivedBatch}
                    batchArrivedLoading={batchArrivedLoading}
                    batchArrivedError={batchArrivedError}
                    batchArrivedResults={batchArrivedResults}
                    onAddToArrivedBatch={addToArrivedBatch}
                    onRemoveFromArrivedBatch={removeFromArrivedBatch}
                    onClearArrivedBatch={clearArrivedBatch}
                    onBatchArrived={handleBatchArrived}
                    onResolveQrHash={resolveQrHash}
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
                    canAdd={canAdd}
                    isAdmin={!!profile?.isAdmin}
                    companyName={profile?.companyName || ''}
                    onBulkAddMedications={bulkAddMedications}
                />
            )}

            {showAdmin && (
                <AdminPage
                    userName={profile?.username || 'User'}
                    onAccountClick={() => navigate('/account')}
                    onNavSelect={handleNavSelect}
                    adminOrgs={adminOrgs}
                    adminOrgsLoading={adminOrgsLoading}
                    adminOrgsError={adminOrgsError}
                    onReloadAdmin={loadAdminOrgs}
                    onApproveOrg={approveOrg}
                    onRejectOrg={rejectOrg}
                    onDeleteOrg={deleteOrg}
                    onUpdateOrg={updateOrg}
                    onResetOrgPassword={resetOrgPassword}
                    onLoadOrgWorkers={loadAdminOrgWorkers}
                    onDeleteOrgWorker={deleteAdminOrgWorker}
                    onResetOrgWorkerPassword={resetAdminOrgWorkerPassword}
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
                    onRequestEmailChange={requestEmailChange}
                    onBack={() => navigate(profileType === 'org' ? '/org' : '/app')}
                    onLogout={handleLogout}
                    onAdminClick={() => navigate('/app/admin')}
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
