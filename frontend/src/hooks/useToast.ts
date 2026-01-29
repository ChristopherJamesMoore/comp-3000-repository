import { useEffect, useState } from 'react';
import { Toast } from '../types';

export const useToast = () => {
    const [toast, setToast] = useState<Toast | null>(null);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

    return { toast, setToast };
};
