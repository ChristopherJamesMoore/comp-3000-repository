import { useCallback, useEffect, useState } from 'react';

export const useRouting = () => {
    const [route, setRoute] = useState(window.location.pathname || '/');

    useEffect(() => {
        const onPopState = () => setRoute(window.location.pathname || '/');
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const navigate = useCallback((path: string) => {
        setRoute((currentRoute) => {
            if (path !== currentRoute) {
                window.history.pushState({}, '', path);
                return path;
            }
            return currentRoute;
        });
    }, []);

    const requiresAuth = route === '/app' || route === '/account' || route === '/app/add';

    return { route, navigate, requiresAuth };
};
