export type Toast = { type: 'success' | 'error' | 'info'; message: string };

export type Medication = {
    serialNumber: string;
    medicationName: string;
    gtin: string;
    batchNumber: string;
    expiryDate: string;
    productionCompany: string;
    distributionCompany: string;
    pharmacyCompany: string;
    qrHash?: string;
    status?: 'manufactured' | 'received' | 'arrived';
    statusUpdatedAt?: string;
    statusUpdatedBy?: string;
    statusUpdatedByCompanyType?: string;
    statusUpdatedByCompanyName?: string;
};

export type AuditEntry = {
    serialNumber: string;
    action: 'manufactured' | 'received' | 'arrived';
    createdAt: string;
    actorUsername: string;
    actorCompanyType: string;
    actorCompanyName: string;
};

export type UserProfile = {
    username: string;
    companyType?: string;
    companyName?: string;
    isAdmin?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    registrationNumber?: string;
    email?: string;
    approvedBy?: string;
    approvedAt?: string;
    // org/worker system
    type?: 'platform' | 'org' | 'worker';
    orgId?: string;
    jobTitle?: string;
    adminEmail?: string;
    adminFirstName?: string;
    adminLastName?: string;
    theme?: string;
};

export type OrgWorker = {
    workerId?: string;
    username: string;
    orgId: string;
    companyName: string;
    companyType: string;
    jobTitle?: string;
    createdAt?: string;
    createdBy?: string;
};

export type OrgProfile = {
    orgId: string;
    adminUsername: string;
    companyName: string;
    companyType: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    adminEmail?: string;
    adminFirstName?: string;
    adminLastName?: string;
    registrationNumber?: string;
    workerCount?: number;
    createdAt?: string;
    approvedAt?: string;
};

export type ActivityEntry = {
    username: string;
    orgId: string;
    action: string;
    serialNumbers: string[];
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type AuditLogEntry = {
    actor: { username: string; type: 'worker' | 'org_admin' | 'platform_admin' };
    orgId: string | null;
    action: string;
    target: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type AuditStorageInfo = {
    orgAuditBytes: number;
    platformAuditBytes: number;
    limitBytes: number;
};

export type AuthMode = 'login' | 'signup';

export type BatchResultItem = {
    serialNumber: string;
    status?: string;
    error?: string;
};

export type BatchResult = {
    ok: boolean;
    processed: number;
    succeeded: BatchResultItem[];
    failed: BatchResultItem[];
};
