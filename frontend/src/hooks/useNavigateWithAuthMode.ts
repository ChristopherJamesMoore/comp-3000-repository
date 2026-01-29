import { useCallback } from 'react';
import type { AuthMode } from '../types';

export const useNavigateWithAuthMode = (
    navigate: (path: string) => void,
    setAuthMode: (mode: AuthMode) => void
) => {
    return useCallback(
        (path: string, mode?: AuthMode) => {
            if (mode) {
                setAuthMode(mode);
            }
            navigate(path);
        },
        [navigate, setAuthMode]
    );
};
