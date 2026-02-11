export type Toast = { type: 'success' | 'error' | 'info'; message: string };

export type Medication = {
    serialNumber: string;
    medicationName: string;
    gtin: string;
    batchNumber: string;
    expiryDate: string;
    productionCompany: string;
    distributionCompany: string;
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
    approvedBy?: string;
    approvedAt?: string;
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
