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

    const handleLoginFormChange = (field: 'username' | 'password', value: string) => {
        setLoginForm((current) => ({ ...current, [field]: value }));
    };

    const handleProfileFormChange = (field: 'companyType' | 'companyName', value: string) => {
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
        setProfileForm({ companyType: '', companyName: '' });
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
        authFetch,
        loadAdminUsers,
        handleLoginFormChange,
        handleProfileFormChange,
        handleToggleAuthMode,
        handleLogin,
        handleSignup,
        handleLogout,
        handleProfileSave
    };
};
