import React from 'react';
import { Plus, Truck, CheckCircle2, List, Shield } from 'lucide-react';

export type DashboardNav = 'add' | 'receive' | 'arrived' | 'view' | 'admin';

type DashboardLayoutProps = {
    userName: string;
    onAccountClick: () => void;
    activeNav: DashboardNav;
    onNavSelect: (nav: DashboardNav) => void;
    heading: string;
    subheading: string;
    children: React.ReactNode;
    canAdd?: boolean;
    canReceive?: boolean;
    canArrived?: boolean;
    isAdmin?: boolean;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    userName,
    onAccountClick,
    activeNav,
    onNavSelect,
    heading,
    subheading,
    children,
    canAdd = true,
    canReceive = true,
    canArrived = true,
    isAdmin = false
}) => (
    <div className="dashboard">
        <aside className="dashboard__sidebar">
            <div className="dashboard__brand">LedgRx</div>
            <button className="dashboard__account" onClick={onAccountClick}>
                <span>Account</span>
                <strong>{userName}</strong>
            </button>
            <nav className="dashboard__nav">
                {!isAdmin && (
                    <button
                        className={activeNav === 'add' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('add')}
                    >
                        <Plus size={16} />
                        Add medication
                    </button>
                )}
                {!isAdmin && (
                    <button
                        className={activeNav === 'receive' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('receive')}
                    >
                        <Truck size={16} />
                        Mark received by distributor
                    </button>
                )}
                {!isAdmin && (
                    <button
                        className={activeNav === 'arrived' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('arrived')}
                    >
                        <CheckCircle2 size={16} />
                        Mark arrived at pharmacy
                    </button>
                )}
                <button
                    className={activeNav === 'view' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                    onClick={() => onNavSelect('view')}
                >
                    <List size={16} />
                    View records
                </button>
                {isAdmin && (
                    <button
                        className={activeNav === 'admin' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('admin')}
                    >
                        <Shield size={16} />
                        Admin
                    </button>
                )}
            </nav>
        </aside>

        <div className="dashboard__content">
            <div className="dashboard__topbar">
                <div>
                    <h1>{heading}</h1>
                    <p>{subheading}</p>
                </div>
            </div>
            {children}
        </div>
    </div>
);

export default DashboardLayout;
