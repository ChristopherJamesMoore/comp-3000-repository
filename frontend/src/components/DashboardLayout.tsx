import React from 'react';
import { Plus, Truck, CheckCircle2, List } from 'lucide-react';

export type DashboardNav = 'add' | 'receive' | 'arrived' | 'view';

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
    canArrived = true
}) => (
    <div className="dashboard">
        <aside className="dashboard__sidebar">
            <div className="dashboard__brand">LedgRx</div>
            <button className="dashboard__account" onClick={onAccountClick}>
                <span>Account</span>
                <strong>{userName}</strong>
            </button>
            <nav className="dashboard__nav">
                <button
                    className={activeNav === 'add' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                    onClick={() => onNavSelect('add')}
                    disabled={!canAdd}
                >
                    <Plus size={16} />
                    Add medication
                </button>
                <button
                    className={activeNav === 'receive' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                    onClick={() => onNavSelect('receive')}
                    disabled={!canReceive}
                >
                    <Truck size={16} />
                    Mark received
                </button>
                <button
                    className={activeNav === 'arrived' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                    onClick={() => onNavSelect('arrived')}
                    disabled={!canArrived}
                >
                    <CheckCircle2 size={16} />
                    Mark arrived
                </button>
                <button
                    className={activeNav === 'view' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                    onClick={() => onNavSelect('view')}
                >
                    <List size={16} />
                    View records
                </button>
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
