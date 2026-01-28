const API_BASE =
    (process.env.REACT_APP_API_BASE_URL && process.env.REACT_APP_API_BASE_URL.trim()) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim()) ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : 'https://ledgrx.duckdns.org');

export const buildUrl = (path: string) => `${API_BASE.replace(/\/$/, '')}${path}`;

export { API_BASE };
