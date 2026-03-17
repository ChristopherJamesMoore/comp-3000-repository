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
                window.scrollTo(0, 0);
                return path;
            }
            return currentRoute;
        });
    }, []);

    const requiresAuth = route === '/app' || route === '/account' || route === '/app/add' || route === '/org';

    return { route, navigate, requiresAuth };
};
