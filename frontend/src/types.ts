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
};

export type UserProfile = {
    username: string;
    companyType?: string;
    companyName?: string;
    isAdmin?: boolean;
};

export type AuthMode = 'login' | 'signup';
