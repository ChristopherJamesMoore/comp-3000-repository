import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { API_BASE, buildUrl } from '../utils/api';
import { AuthMode, Toast, UserProfile } from '../types';

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
    const [profileForm, setProfileForm] = useState({ companyType: '', companyName: '', registrationNumber: '', email: '' });
    const [profileError, setProfileError] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
    const [adminError, setAdminError] = useState('');
    const [adminLoading, setAdminLoading] = useState(false);
    const [hasAdmin, setHasAdmin] = useState(true);

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
        try {
            const response = await authFetch('/api/auth/me');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setProfileError(errorData.error || 'Failed to load profile.');
                return;
            }
            const data = await response.json();
            setProfile(data);
            setProfileError('');
            setProfileForm({
                companyType: data.companyType || '',
                companyName: data.companyName || '',
                registrationNumber: data.registrationNumber || '',
                email: data.email || ''
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

    useEffect(() => {
        if (profile?.isAdmin) {
            loadAdminUsers();
        } else {
            setAdminUsers([]);
        }
    }, [loadAdminUsers, profile?.isAdmin]);

    useEffect(() => {
        if (!authToken && requiresAuth) {
            setAuthMode('login');
            navigate('/login');
        }
    }, [authToken, navigate, requiresAuth]);

    const handleLoginFormChange = (field: 'username' | 'password' | 'email', value: string) => {
        setLoginForm((current) => ({ ...current, [field]: value }));
    };

    const handleProfileFormChange = (field: 'companyType' | 'companyName' | 'registrationNumber' | 'email', value: string) => {
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
                setAuthToken(data.token);
                setLoginForm({ username: '', password: '', email: '' });
                if (data.user) {
                    setProfile(data.user);
                    setProfileForm({
                        companyType: data.user.companyType || '',
                        companyName: data.user.companyName || '',
                        registrationNumber: data.user.registrationNumber || '',
                        email: data.user.email || ''
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
                        registrationNumber: data.user.registrationNumber || '',
                        email: data.user.email || ''
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
        setAuthToken(null);
        setProfile(null);
        setProfileForm({ companyType: '', companyName: '', registrationNumber: '', email: '' });
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
                        registrationNumber: profileForm.registrationNumber.trim(),
                        email: profileForm.email.trim()
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

    const bootstrapAdmin = useCallback(
        async (username: string, password: string) => {
            const response = await fetch(buildUrl('/api/admin/bootstrap'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Bootstrap failed.');
            }
            localStorage.setItem('authToken', data.token);
            setAuthToken(data.token);
            if (data.user) {
                setProfile(data.user);
                setProfileForm({ companyType: '', companyName: '', registrationNumber: '', email: '' });
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
        bootstrapAdmin
    };
};
