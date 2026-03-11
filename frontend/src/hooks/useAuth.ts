import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { API_BASE, buildUrl } from '../utils/api';
import { AuthMode, OrgProfile, OrgWorker, Toast, UserProfile } from '../types';

export type AuthFetch = (path: string, options?: RequestInit) => Promise<Response>;

type UseAuthOptions = {
    requiresAuth: boolean;
    navigate: (path: string) => void;
    setToast?: (toast: Toast | null) => void;
};

export const useAuth = ({ requiresAuth, navigate, setToast }: UseAuthOptions) => {
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [authError, setAuthError] = useState('');
    const [loginForm, setLoginForm] = useState({ username: '', password: '', email: '' });
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileForm, setProfileForm] = useState({ companyType: '', companyName: '', registrationNumber: '' });
    const [profileError, setProfileError] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
    const [adminError, setAdminError] = useState('');
    const [adminLoading, setAdminLoading] = useState(false);
    const [hasAdmin, setHasAdmin] = useState(true);
    const [adminOrgs, setAdminOrgs] = useState<OrgProfile[]>([]);
    const [adminOrgsLoading, setAdminOrgsLoading] = useState(false);
    const [adminOrgsError, setAdminOrgsError] = useState('');
    const [orgWorkers, setOrgWorkers] = useState<OrgWorker[]>([]);
    const [orgWorkersLoading, setOrgWorkersLoading] = useState(false);
    const [orgWorkersError, setOrgWorkersError] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('authToken');
        if (stored) {
            setAuthToken(stored);
        }
        fetch(buildUrl('/api/admin/check'))
            .then((r) => r.json())
            .then((d) => setHasAdmin(!!d.hasAdmin))
            .catch(() => setHasAdmin(true));
    }, []);

    const authFetch = useCallback<AuthFetch>(
        (path: string, options: RequestInit = {}) => {
            const headers = new Headers(options.headers || {});
            if (authToken) {
                headers.set('Authorization', `Bearer ${authToken}`);
            }
            if (!headers.has('Content-Type') && options.body) {
                headers.set('Content-Type', 'application/json');
            }
            return fetch(buildUrl(path), { ...options, headers });
        },
        [authToken]
    );

    const loadProfile = useCallback(async () => {
        if (!authToken) return;
        const tokenType = localStorage.getItem('authTokenType') || 'platform';
        try {
            if (tokenType === 'org') {
                const response = await authFetch('/api/org/me');
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    setProfileError(errorData.error || 'Failed to load profile.');
                    return;
                }
                const org = await response.json();
                const mappedProfile: UserProfile = {
                    username: org.adminUsername,
                    companyType: org.companyType,
                    companyName: org.companyName,
                    approvalStatus: org.approvalStatus,
                    registrationNumber: org.registrationNumber,
                    email: org.adminEmail,
                    adminEmail: org.adminEmail,
                    adminFirstName: org.adminFirstName,
                    adminLastName: org.adminLastName,
                    isAdmin: false,
                    type: 'org',
                    orgId: org.orgId
                };
                setProfile(mappedProfile);
                setProfileError('');
                setProfileForm({
                    companyType: org.companyType || '',
                    companyName: org.companyName || '',
                    registrationNumber: org.registrationNumber || ''
                });
                return;
            }
            if (tokenType === 'worker') {
                const response = await authFetch('/api/worker/me');
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    setProfileError(errorData.error || 'Failed to load profile.');
                    return;
                }
                const worker = await response.json();
                const mappedProfile: UserProfile = {
                    username: worker.username,
                    companyType: worker.companyType,
                    companyName: worker.companyName,
                    approvalStatus: 'approved',
                    isAdmin: false,
                    type: 'worker',
                    orgId: worker.orgId,
                    jobTitle: worker.jobTitle
                };
                setProfile(mappedProfile);
                setProfileError('');
                setProfileForm({
                    companyType: worker.companyType || '',
                    companyName: worker.companyName || '',
                    registrationNumber: ''
                });
                return;
            }
            // Platform admin / legacy
            const response = await authFetch('/api/auth/me');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setProfileError(errorData.error || 'Failed to load profile.');
                return;
            }
            const data = await response.json();
            setProfile({ ...data, type: 'platform' });
            setProfileError('');
            setProfileForm({
                companyType: data.companyType || '',
                companyName: data.companyName || '',
                registrationNumber: data.registrationNumber || ''
            });
        } catch (error) {
            setProfileError('Failed to load profile.');
        }
    }, [authFetch, authToken]);

    const loadAdminUsers = useCallback(async () => {
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
    }, [authFetch, authToken]);

    useEffect(() => {
        if (!authToken) {
            setProfile(null);
            return;
        }
        loadProfile();
    }, [authToken, loadProfile]);

    const loadAdminOrgs = useCallback(async () => {
        if (!authToken) return;
        setAdminOrgsLoading(true);
        setAdminOrgsError('');
        try {
            const response = await authFetch('/api/admin/orgs');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load organisations.');
            }
            const data = await response.json();
            setAdminOrgs(Array.isArray(data.orgs) ? data.orgs : []);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setAdminOrgsError(message || 'Failed to load organisations.');
        } finally {
            setAdminOrgsLoading(false);
        }
    }, [authFetch, authToken]);

    useEffect(() => {
        if (profile?.isAdmin) {
            loadAdminUsers();
            loadAdminOrgs();
        } else {
            setAdminUsers([]);
            setAdminOrgs([]);
        }
    }, [loadAdminUsers, loadAdminOrgs, profile?.isAdmin]);

    useEffect(() => {
        if (!authToken && requiresAuth) {
            setAuthMode('login');
            navigate('/login');
        }
    }, [authToken, navigate, requiresAuth]);

    // Detect ?emailToken= in URL on mount (from email confirmation link)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('emailToken');
        if (!token) return;
        window.history.replaceState(null, '', window.location.pathname);
        fetch(buildUrl(`/api/auth/email-change-confirm?token=${encodeURIComponent(token)}`))
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    if (setToast) setToast({ type: 'success', message: 'Email address updated successfully.' });
                    setProfile((prev) => (prev ? { ...prev, email: data.email } : prev));
                } else {
                    if (setToast) setToast({ type: 'error', message: data.error || 'Email confirmation failed.' });
                }
            })
            .catch(() => {
                if (setToast) setToast({ type: 'error', message: 'Email confirmation failed.' });
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLoginFormChange = (field: 'username' | 'password' | 'email', value: string) => {
        setLoginForm((current) => ({ ...current, [field]: value }));
    };

    const handleProfileFormChange = (field: 'companyType' | 'companyName' | 'registrationNumber', value: string) => {
        setProfileForm((current) => ({ ...current, [field]: value }));
    };

    const handleToggleAuthMode = () => {
        setAuthError('');
        setAuthMode((current) => (current === 'signup' ? 'login' : 'signup'));
    };

    const handleLogin = useCallback(
        async (e: FormEvent) => {
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
                localStorage.setItem('authTokenType', 'platform');
                setAuthToken(data.token);
                setLoginForm({ username: '', password: '', email: '' });
                if (data.user) {
                    setProfile({ ...data.user, type: 'platform' });
                    setProfileForm({
                        companyType: data.user.companyType || '',
                        companyName: data.user.companyName || '',
                        registrationNumber: data.user.registrationNumber || ''
                    });
                }
                navigate('/app');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                setAuthError(message || `Login failed. Check API at ${API_BASE}.`);
            }
        },
        [loginForm, navigate]
    );

    const handleSignup = useCallback(
        async (e: FormEvent) => {
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
                        password: loginForm.password,
                        email: loginForm.email.trim()
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
                setLoginForm({ username: '', password: '', email: '' });
                if (data.user) {
                    setProfile(data.user);
                    setProfileForm({
                        companyType: data.user.companyType || '',
                        companyName: data.user.companyName || '',
                        registrationNumber: data.user.registrationNumber || ''
                    });
                }
                setAuthMode('login');
                navigate('/app');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                setAuthError(message || `Sign up failed. Check API at ${API_BASE}.`);
            }
        },
        [loginForm, navigate]
    );

    const handleLogout = useCallback(() => {
        if (authToken) {
            authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenType');
        setAuthToken(null);
        setProfile(null);
        setProfileForm({ companyType: '', companyName: '', registrationNumber: '' });
        setAdminOrgs([]);
        setOrgWorkers([]);
        navigate('/');
    }, [authFetch, authToken, navigate]);

    const handleProfileSave = useCallback(
        async (e: FormEvent) => {
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
                        companyName: profileForm.companyName.trim(),
                        registrationNumber: profileForm.registrationNumber.trim()
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    setProfileError(errorData.error || 'Failed to update profile.');
                    return;
                }
                const data = await response.json();
                setProfile(data);
                setProfileError('');
                if (setToast) {
                    setToast({ type: 'success', message: 'Account details updated.' });
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                setProfileError(message || 'Failed to update profile.');
            } finally {
                setProfileSaving(false);
            }
        },
        [authFetch, profileForm, setToast]
    );

    const approveUser = useCallback(
        async (username: string) => {
            const response = await authFetch(`/api/admin/users/${encodeURIComponent(username)}/approve`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to approve user.');
            }
            return response.json();
        },
        [authFetch]
    );

    const rejectUser = useCallback(
        async (username: string) => {
            const response = await authFetch(`/api/admin/users/${encodeURIComponent(username)}/reject`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reject user.');
            }
            return response.json();
        },
        [authFetch]
    );

    const deleteUser = useCallback(
        async (username: string) => {
            const response = await authFetch(`/api/admin/users/${encodeURIComponent(username)}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete user.');
            }
            return response.json();
        },
        [authFetch]
    );

    const updateUserCompany = useCallback(
        async (username: string, data: { companyType: string; companyName: string; registrationNumber: string; email: string }) => {
            const response = await authFetch(`/api/admin/users/${encodeURIComponent(username)}/company`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update company info.');
            }
            return response.json();
        },
        [authFetch]
    );

    const resetUserPassword = useCallback(
        async (username: string, newPassword: string) => {
            const response = await authFetch(`/api/admin/users/${encodeURIComponent(username)}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ newPassword })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reset password.');
            }
            return response.json();
        },
        [authFetch]
    );

    const requestEmailChange = useCallback(
        async (newEmail: string) => {
            const response = await authFetch('/api/auth/email-change-request', {
                method: 'POST',
                body: JSON.stringify({ newEmail })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to send confirmation email.');
            }
            return response.json();
        },
        [authFetch]
    );

    const platformLogin = useCallback(
        async (username: string) => {
            const beginRes = await fetch(buildUrl('/api/auth/webauthn/login/begin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            if (!beginRes.ok) {
                const err = await beginRes.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to start passkey login.');
            }
            const options = await beginRes.json();
            const credential = await startAuthentication({ optionsJSON: options });
            const completeRes = await fetch(buildUrl('/api/auth/webauthn/login/complete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, credential }),
            });
            if (!completeRes.ok) {
                const err = await completeRes.json().catch(() => ({}));
                throw new Error(err.error || 'Passkey login failed.');
            }
            const data = await completeRes.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authTokenType', 'platform');
            setAuthToken(data.token);
            if (data.user) setProfile({ ...data.user, type: 'platform' });
            return data;
        },
        []
    );

    const orgLogin = useCallback(
        async (username: string) => {
            const beginRes = await fetch(buildUrl('/api/org/webauthn/login/begin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            if (!beginRes.ok) {
                const err = await beginRes.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to start passkey login.');
            }
            const options = await beginRes.json();
            const credential = await startAuthentication({ optionsJSON: options });
            const completeRes = await fetch(buildUrl('/api/org/webauthn/login/complete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, credential }),
            });
            if (!completeRes.ok) {
                const err = await completeRes.json().catch(() => ({}));
                throw new Error(err.error || 'Passkey login failed.');
            }
            const data = await completeRes.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authTokenType', 'org');
            setAuthToken(data.token);
            const org = data.org;
            setProfile({
                username: org.adminUsername,
                companyType: org.companyType,
                companyName: org.companyName,
                approvalStatus: org.approvalStatus,
                registrationNumber: org.registrationNumber,
                email: org.adminEmail,
                adminEmail: org.adminEmail,
                adminFirstName: org.adminFirstName,
                adminLastName: org.adminLastName,
                isAdmin: false,
                type: 'org',
                orgId: org.orgId,
            });
            return data;
        },
        []
    );

    const workerLogin = useCallback(
        async (username: string) => {
            const beginRes = await fetch(buildUrl('/api/worker/webauthn/login/begin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            if (!beginRes.ok) {
                const err = await beginRes.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to start passkey login.');
            }
            const options = await beginRes.json();
            const credential = await startAuthentication({ optionsJSON: options });
            const completeRes = await fetch(buildUrl('/api/worker/webauthn/login/complete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, credential }),
            });
            if (!completeRes.ok) {
                const err = await completeRes.json().catch(() => ({}));
                throw new Error(err.error || 'Passkey login failed.');
            }
            const data = await completeRes.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authTokenType', 'worker');
            setAuthToken(data.token);
            const worker = data.worker;
            setProfile({
                username: worker.username,
                companyType: worker.companyType,
                companyName: worker.companyName,
                approvalStatus: 'approved',
                isAdmin: false,
                type: 'worker',
                orgId: worker.orgId,
                jobTitle: worker.jobTitle,
            });
            return data;
        },
        []
    );

    const handleOrgSignup = useCallback(
        async (formData: {
            adminFirstName: string; adminLastName: string; adminUsername: string;
            adminEmail: string; companyName: string; companyType: string; registrationNumber: string;
        }) => {
            // Step 1: create org record, get registration options back
            const signupRes = await fetch(buildUrl('/api/org/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!signupRes.ok) {
                const err = await signupRes.json().catch(() => ({}));
                throw new Error(err.error || 'Signup failed.');
            }
            const signupData = await signupRes.json();
            // Step 2: browser creates passkey
            const credential = await startRegistration({ optionsJSON: signupData.registrationOptions });
            // Step 3: send credential back to complete registration
            const completeRes = await fetch(buildUrl('/api/org/webauthn/register/complete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminUsername: formData.adminUsername, credential }),
            });
            if (!completeRes.ok) {
                const err = await completeRes.json().catch(() => ({}));
                throw new Error(err.error || 'Passkey registration failed.');
            }
            const data = await completeRes.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authTokenType', 'org');
            setAuthToken(data.token);
            const org = data.org;
            setProfile({
                username: org.adminUsername,
                companyType: org.companyType,
                companyName: org.companyName,
                approvalStatus: 'pending',
                isAdmin: false,
                type: 'org',
                orgId: org.orgId,
            });
            return data;
        },
        []
    );

    // ── Org admin — worker management ───────────────────────────────────────

    const loadOrgWorkers = useCallback(async () => {
        if (!authToken) return;
        setOrgWorkersLoading(true);
        setOrgWorkersError('');
        try {
            const response = await authFetch('/api/org/workers');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load workers.');
            }
            const data = await response.json();
            setOrgWorkers(Array.isArray(data.workers) ? data.workers : []);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setOrgWorkersError(message);
        } finally {
            setOrgWorkersLoading(false);
        }
    }, [authFetch, authToken]);

    const addOrgWorker = useCallback(
        async (username: string, jobTitle: string) => {
            const response = await authFetch('/api/org/workers', {
                method: 'POST',
                body: JSON.stringify({ username, jobTitle }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to add worker.');
            }
            return response.json(); // { worker, inviteUrl }
        },
        [authFetch]
    );

    const removeOrgWorker = useCallback(
        async (username: string) => {
            const response = await authFetch(`/api/org/workers/${encodeURIComponent(username)}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to remove worker.');
            }
            return response.json();
        },
        [authFetch]
    );

    const updateOrgWorkerJobTitle = useCallback(
        async (username: string, jobTitle: string) => {
            const response = await authFetch(`/api/org/workers/${encodeURIComponent(username)}`, {
                method: 'PATCH',
                body: JSON.stringify({ jobTitle })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update worker.');
            }
            return response.json();
        },
        [authFetch]
    );

    const bulkAddWorkers = useCallback(
        async (workers: { username: string; jobTitle: string }[]) => {
            const res = await authFetch('/api/org/workers/bulk', { method: 'POST', body: JSON.stringify({ workers }) });
            if (!res.ok) throw new Error((await res.json()).error || 'Bulk import failed');
            return res.json(); // { succeeded: [{ username, inviteUrl }], failed: [...] }
        },
        [authFetch]
    );

    // ── Platform admin — org management ────────────────────────────────────

    const approveOrg = useCallback(
        async (orgId: string) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}/approve`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to approve organisation.');
            }
            return response.json();
        },
        [authFetch]
    );

    const rejectOrg = useCallback(
        async (orgId: string) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}/reject`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reject organisation.');
            }
            return response.json();
        },
        [authFetch]
    );

    const deleteOrg = useCallback(
        async (orgId: string) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete organisation.');
            }
            return response.json();
        },
        [authFetch]
    );

    const updateOrg = useCallback(
        async (orgId: string, data: { companyName?: string; companyType?: string; registrationNumber?: string; adminEmail?: string }) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update organisation.');
            }
            return response.json();
        },
        [authFetch]
    );

    const resetOrgPasskey = useCallback(
        async (orgId: string) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}/passkeys`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reset passkey.');
            }
            return response.json(); // { ok, registerUrl }
        },
        [authFetch]
    );

    const loadAdminOrgWorkers = useCallback(
        async (orgId: string): Promise<OrgWorker[]> => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}/workers`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load workers.');
            }
            const data = await response.json();
            return Array.isArray(data.workers) ? data.workers : [];
        },
        [authFetch]
    );

    const deleteAdminOrgWorker = useCallback(
        async (orgId: string, username: string) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}/workers/${encodeURIComponent(username)}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete worker.');
            }
            return response.json();
        },
        [authFetch]
    );

    const resetWorkerPasskey = useCallback(
        async (orgId: string, username: string) => {
            const response = await authFetch(`/api/admin/orgs/${encodeURIComponent(orgId)}/workers/${encodeURIComponent(username)}/passkeys`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reset passkey.');
            }
            return response.json(); // { ok, registerUrl }
        },
        [authFetch]
    );

    const addBackupPasskey = useCallback(
        async () => {
            const beginRes = await authFetch('/api/admin/webauthn/backup/begin', { method: 'POST' });
            const beginData = await beginRes.json();
            if (!beginRes.ok) throw new Error(beginData.error || 'Failed to begin backup passkey.');
            const credential = await startRegistration({ optionsJSON: beginData });
            const completeRes = await authFetch('/api/admin/webauthn/backup/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });
            const completeData = await completeRes.json();
            if (!completeRes.ok) throw new Error(completeData.error || 'Failed to register backup passkey.');
        },
        [authFetch]
    );

    const bootstrapAdmin = useCallback(
        async (username: string) => {
            // Step 1: create admin user, get registration options
            const bootstrapRes = await fetch(buildUrl('/api/admin/bootstrap'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const bootstrapData = await bootstrapRes.json();
            if (!bootstrapRes.ok) throw new Error(bootstrapData.error || 'Bootstrap failed.');
            // Step 2: browser creates passkey
            const credential = await startRegistration({ optionsJSON: bootstrapData.registrationOptions });
            // Step 3: complete registration
            const completeRes = await fetch(buildUrl('/api/auth/webauthn/register/complete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, credential }),
            });
            const data = await completeRes.json();
            if (!completeRes.ok) throw new Error(data.error || 'Passkey registration failed.');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authTokenType', 'platform');
            setAuthToken(data.token);
            if (data.user) {
                setProfile({ ...data.user, type: 'platform' });
                setProfileForm({ companyType: '', companyName: '', registrationNumber: '' });
            }
            setHasAdmin(true);
            return data;
        },
        []
    );

    return {
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
        hasAdmin,
        authFetch,
        loadAdminUsers,
        handleLoginFormChange,
        handleProfileFormChange,
        handleToggleAuthMode,
        handleLogin,
        handleSignup,
        handleLogout,
        handleProfileSave,
        approveUser,
        rejectUser,
        deleteUser,
        updateUserCompany,
        resetUserPassword,
        requestEmailChange,
        bootstrapAdmin,
        // org/worker system
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
        resetOrgPasskey,
        loadAdminOrgWorkers,
        deleteAdminOrgWorker,
        resetWorkerPasskey,
        addBackupPasskey,
        orgWorkers,
        orgWorkersLoading,
        orgWorkersError,
        loadOrgWorkers,
        addOrgWorker,
        removeOrgWorker,
        updateOrgWorkerJobTitle,
        bulkAddWorkers
    };
};
