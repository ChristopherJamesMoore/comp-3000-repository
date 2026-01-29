import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';
import { buildUrl, API_BASE } from './utils/api';
import { Medication, Toast, UserProfile, AuthMode } from './types';
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
import { DashboardNav } from './components/DashboardLayout';

const App: React.FC = () => {
    const [route, setRoute] = useState(window.location.pathname || '/');
    const [activeTab, setActiveTab] = useState<DashboardNav>('view');
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [addError, setAddError] = useState('');
    const [toast, setToast] = useState<Toast | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [lookupSerial, setLookupSerial] = useState('');
    const [lookupResult, setLookupResult] = useState<Medication | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [formData, setFormData] = useState<Medication>({
        serialNumber: '',
        medicationName: '',
        gtin: '',
        batchNumber: '',
        expiryDate: '',
        productionCompany: '',
        distributionCompany: ''
    });
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQRHash, setSelectedQRHash] = useState('');
    const [copied, setCopied] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [authError, setAuthError] = useState('');
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileForm, setProfileForm] = useState({ companyType: '', companyName: '' });
    const [profileError, setProfileError] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
    const [adminError, setAdminError] = useState('');
    const [adminLoading, setAdminLoading] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('authToken');
        if (stored) {
            setAuthToken(stored);
        }
    }, []);

    useEffect(() => {
        if (!authToken) {
            setProfile(null);
            return;
        }
        loadProfile();
    }, [authToken]);

    useEffect(() => {
        if (profile?.isAdmin) {
            loadAdminUsers();
        } else {
            setAdminUsers([]);
        }
    }, [profile?.isAdmin]);

    useEffect(() => {
        const onPopState = () => setRoute(window.location.pathname || '/');
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const requiresAuth = route === '/app' || route === '/account' || route === '/app/add';

    useEffect(() => {
        if (!authToken && requiresAuth) {
            navigate('/login', 'login');
        }
    }, [authToken, requiresAuth, route]);

    const navigate = (path: string, mode?: AuthMode) => {
        if (path !== route) {
            window.history.pushState({}, '', path);
            setRoute(path);
        }
        if (mode) {
            setAuthMode(mode);
        }
    };

    const handleLoginFormChange = (field: 'username' | 'password', value: string) => {
        setLoginForm({ ...loginForm, [field]: value });
    };

    const handleProfileFormChange = (field: 'companyType' | 'companyName', value: string) => {
        setProfileForm({ ...profileForm, [field]: value });
    };

    const handleToggleAuthMode = () => {
        setAuthError('');
        setAuthMode(authMode === 'signup' ? 'login' : 'signup');
    };

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

    const authFetch = (path: string, options: RequestInit = {}) => {
        const headers = new Headers(options.headers || {});
        if (authToken) {
            headers.set('Authorization', `Bearer ${authToken}`);
        }
        if (!headers.has('Content-Type') && options.body) {
            headers.set('Content-Type', 'application/json');
        }
        return fetch(buildUrl(path), { ...options, headers });
    };

    const loadProfile = async () => {
        if (!authToken) return;
        try {
            const response = await authFetch('/api/auth/me');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setProfile(data);
            setProfileForm({
                companyType: data.companyType || '',
                companyName: data.companyName || ''
            });
        } catch (error) {
            setProfileError('Failed to load profile.');
        }
    };

    const loadAdminUsers = async () => {
        if (!authToken) return;
        setAdminLoading(true);
        setAdminError('');
        try {
            const response = await authFetch('/api/admin/users');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load users.');
            }
            const data = await response.json();
            setAdminUsers(Array.isArray(data.users) ? data.users : []);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setAdminError(message || 'Failed to load users.');
        } finally {
            setAdminLoading(false);
        }
    };

    const fetchMedications = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await authFetch('/api/medications');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch medications.');
            }
            const data = await response.json();
            setMedications(data);
            setLastUpdated(new Date().toLocaleString());
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setError(message || 'Unable to reach the API.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (route === '/app' && activeTab === 'view') {
            fetchMedications();
        }
    }, [route, activeTab]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        if (
            !formData.serialNumber ||
            !formData.medicationName ||
            !formData.gtin ||
            !formData.batchNumber ||
            !formData.expiryDate ||
            !formData.productionCompany ||
            !formData.distributionCompany
        ) {
            setAddError('All fields are required.');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await authFetch('/api/medications', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                setToast({ type: 'success', message: data.qrHash ? 'Medication anchored on-chain.' : 'Medication added.' });
                setFormData({
                    serialNumber: '',
                    medicationName: '',
                    gtin: '',
                    batchNumber: '',
                    expiryDate: '',
                    productionCompany: '',
                    distributionCompany: ''
                });
            } else {
                const errorData = await response.json();
                const message = errorData.error || 'Upload failed.';
                setAddError(message);
                setToast({ type: 'error', message });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setAddError(message || 'An error occurred while adding the medication.');
            setToast({ type: 'error', message: message || 'Upload failed.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShowQR = (qrHash: string) => {
        if (showQRModal && selectedQRHash === qrHash) {
            setShowQRModal(false);
            return;
        }
        setSelectedQRHash(qrHash);
        setShowQRModal(true);
    };

    const handleCopyHash = async () => {
        if (!selectedQRHash) return;
        try {
            await navigator.clipboard.writeText(selectedQRHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            setToast({ type: 'error', message: 'Copy failed. Try manually selecting the hash.' });
        }
    };

    const handleLookup = async () => {
        if (!lookupSerial.trim()) {
            setLookupError('Enter a serial number to search.');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setLookupResult(null);
        try {
            const response = await authFetch(`/api/medications/${encodeURIComponent(lookupSerial.trim())}`);
            if (response.status === 404) {
                const errorData = await response.json().catch(() => ({}));
                setLookupError(errorData.error || 'Medication not found.');
                return;
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Lookup failed.');
            }
            const data = await response.json();
            setLookupResult(data);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setLookupError(message || 'Lookup failed.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        if (!loginForm.username || !loginForm.password) {
            setAuthError('Enter your username and password.');
            return;
        }
        try {
            const response = await fetch(buildUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setAuthError(errorData.error || 'Login failed.');
                return;
            }
            const data = await response.json();
            if (!data.token) {
                setAuthError('Login failed.');
                return;
            }
            localStorage.setItem('authToken', data.token);
            setAuthToken(data.token);
            setLoginForm({ username: '', password: '' });
            if (data.user) {
                setProfile(data.user);
                setProfileForm({
                    companyType: data.user.companyType || '',
                    companyName: data.user.companyName || ''
                });
            }
            navigate('/app');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setAuthError(message || `Login failed. Check API at ${API_BASE}.`);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        if (!loginForm.username || !loginForm.password) {
            setAuthError('Enter a username and password.');
            return;
        }
        if (loginForm.username.trim().length < 3) {
            setAuthError('Username must be at least 3 characters.');
            return;
        }
        if (loginForm.password.trim().length < 6) {
            setAuthError('Password must be at least 6 characters.');
            return;
        }
        try {
            const response = await fetch(buildUrl('/api/auth/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginForm.username.trim(),
                    password: loginForm.password
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setAuthError(errorData.error || 'Sign up failed.');
                return;
            }
            const data = await response.json();
            if (!data.token) {
                setAuthError('Sign up failed.');
                return;
            }
            localStorage.setItem('authToken', data.token);
            setAuthToken(data.token);
            setLoginForm({ username: '', password: '' });
            if (data.user) {
                setProfile(data.user);
                setProfileForm({
                    companyType: data.user.companyType || '',
                    companyName: data.user.companyName || ''
                });
            }
            setAuthMode('login');
            navigate('/app');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setAuthError(message || `Sign up failed. Check API at ${API_BASE}.`);
        }
    };

    const handleLogout = () => {
        if (authToken) {
            authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setProfile(null);
        setProfileForm({ companyType: '', companyName: '' });
        navigate('/');
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        if (!profileForm.companyType || !profileForm.companyName.trim()) {
            setProfileError('Select a company type and name.');
            return;
        }
        setProfileSaving(true);
        try {
            const response = await authFetch('/api/auth/profile', {
                method: 'POST',
                body: JSON.stringify({
                    companyType: profileForm.companyType,
                    companyName: profileForm.companyName.trim()
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setProfileError(errorData.error || 'Failed to update profile.');
                return;
            }
            const data = await response.json();
            setProfile(data);
            setToast({ type: 'success', message: 'Account details updated.' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setProfileError(message || 'Failed to update profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const filteredMedications = useMemo(() => {
        if (!searchQuery.trim()) return medications;
        const q = searchQuery.trim().toLowerCase();
        return medications.filter((med) => {
            const fields = [
                med.serialNumber,
                med.medicationName,
                med.gtin,
                med.batchNumber,
                med.expiryDate,
                med.productionCompany,
                med.distributionCompany,
                med.qrHash
            ].map((value) => value ?? '');
            return fields.some((value) => value.toLowerCase().includes(q));
        });
    }, [medications, searchQuery]);

    const marketingPages: Record<string, JSX.Element> = {
        '/': <HomePage authToken={authToken} onNavigate={navigate} />,
        '/product': <ProductPage authToken={authToken} onNavigate={navigate} />,
        '/solutions': <SolutionsPage authToken={authToken} onNavigate={navigate} />,
        '/resources': <ResourcesPage authToken={authToken} onNavigate={navigate} />,
        '/customers': <CustomersPage authToken={authToken} onNavigate={navigate} />,
        '/pricing': <PricingPage authToken={authToken} onNavigate={navigate} />
    };

    const showDashboard = route === '/app' && !!authToken;
    const showAddMedication = route === '/app/add' && !!authToken;
    const showAccount = route === '/account' && !!authToken;
    const showLogin = route === '/login' || (!authToken && requiresAuth);
    const showMarketing = !showDashboard && !showAddMedication && !showLogin && !showAccount;
    const marketingPage = marketingPages[route] ?? marketingPages['/'];

    const handleNavSelect = (nav: DashboardNav) => {
        if (nav === 'add') {
            navigate('/app/add');
            return;
        }
        setActiveTab(nav);
        navigate('/app');
    };

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
                    onNavigateHome={() => navigate('/')}
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
                <div className="modal" onClick={() => setShowQRModal(false)}>
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
