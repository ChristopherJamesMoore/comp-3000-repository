import { useCallback, useState } from 'react';
import type { DashboardNav } from '../components/DashboardLayout';

export const useDashboardNav = (navigate: (path: string) => void) => {
    const [activeTab, setActiveTab] = useState<DashboardNav>('view');

    const handleNavSelect = useCallback(
        (nav: DashboardNav) => {
            if (nav === 'add') {
                navigate('/app/add');
                return;
            }
            if (nav === 'admin') {
                navigate('/app/admin');
                return;
            }
            if (nav === 'security') {
                navigate('/app/admin/security');
                return;
            }
            setActiveTab(nav);
            navigate('/app');
        },
        [navigate]
    );

    return { activeTab, handleNavSelect };
};
