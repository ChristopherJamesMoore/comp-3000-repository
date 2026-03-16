import React, { useEffect } from 'react';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';
import { AuditLogList } from '../components/AuditLogList';
import { useAdminAuditLog } from '../hooks/useAuditLog';

type AdminAuditPageProps = {
    userName: string;
    onAccountClick: () => void;
    onNavSelect: (nav: DashboardNav) => void;
};

const AdminAuditPage: React.FC<AdminAuditPageProps> = ({ userName, onAccountClick, onNavSelect }) => {
    const audit = useAdminAuditLog();

    useEffect(() => {
        audit.load();
        audit.loadStorage();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <DashboardLayout
            userName={userName}
            onAccountClick={onAccountClick}
            activeNav="audit"
            onNavSelect={onNavSelect}
            heading="Audit Log"
            isAdmin
        >
            <AuditLogList
                entries={audit.entries}
                total={audit.total}
                page={audit.page}
                loading={audit.loading}
                error={audit.error}
                onPageChange={audit.setPage}
                showOrg
                storageBytes={audit.storage?.platformAuditBytes}
                limitBytes={audit.storage?.limitBytes}
                onExport={audit.exportCsv}
                onReset={audit.reset}
            />
        </DashboardLayout>
    );
};

export default AdminAuditPage;
