import React, { useEffect, useState } from 'react';
import { Plus, Truck, CheckCircle2, List, Shield, ShieldCheck, ChevronLeft, ChevronRight, UserCircle2, ClipboardList, FileText } from 'lucide-react';

export type DashboardNav = 'add' | 'receive' | 'arrived' | 'view' | 'activity' | 'admin' | 'security' | 'audit';

type DashboardLayoutProps = {
    userName: string;
    onAccountClick: () => void;
    activeNav: DashboardNav;
    onNavSelect: (nav: DashboardNav) => void;
    heading: string;
    subheading?: string;
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
}) => {
    const sidebarStorageKey = 'ledgrx.dashboard.sidebarCollapsed';
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        const saved = window.localStorage.getItem(sidebarStorageKey);
        return saved === 'true';
    });

    useEffect(() => {
        window.localStorage.setItem(sidebarStorageKey, String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    return (
    <div className={`dashboard${sidebarCollapsed ? ' dashboard--collapsed' : ''}`}>
        <aside className="dashboard__sidebar">
            <div className="dashboard__sidebar-top">
                <div className="dashboard__brand">
                    <span className="dashboard__brand-text">LedgRx</span>
                </div>
                <button
                    type="button"
                    className="dashboard__collapse"
                    onClick={() => setSidebarCollapsed((prev) => !prev)}
                    aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>
            <button className="dashboard__account" onClick={onAccountClick} title={userName}>
                <UserCircle2 size={18} className="dashboard__account-icon" />
                <div className="dashboard__account-meta">
                    <span>Account</span>
                    <strong>{userName}</strong>
                </div>
            </button>
            <nav className="dashboard__nav">
                {!isAdmin && (
                    <button
                        className={activeNav === 'add' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('add')}
                        title="Add medication"
                    >
                        <Plus size={16} />
                        <span className="dashboard__link-label">Add medication</span>
                    </button>
                )}
                {!isAdmin && (
                    <button
                        className={activeNav === 'receive' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('receive')}
                        title="Mark received by distributor"
                    >
                        <Truck size={16} />
                        <span className="dashboard__link-label">Mark received by distributor</span>
                    </button>
                )}
                {!isAdmin && (
                    <button
                        className={activeNav === 'arrived' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('arrived')}
                        title="Mark arrived at pharmacy"
                    >
                        <CheckCircle2 size={16} />
                        <span className="dashboard__link-label">Mark arrived at pharmacy</span>
                    </button>
                )}
                <button
                    className={activeNav === 'view' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                    onClick={() => onNavSelect('view')}
                    title="View records"
                >
                    <List size={16} />
                    <span className="dashboard__link-label">View records</span>
                </button>
                {!isAdmin && (
                    <button
                        className={activeNav === 'activity' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('activity')}
                        title="Activity"
                    >
                        <ClipboardList size={16} />
                        <span className="dashboard__link-label">Activity</span>
                    </button>
                )}
                {isAdmin && (
                    <button
                        className={activeNav === 'admin' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('admin')}
                        title="Admin"
                    >
                        <Shield size={16} />
                        <span className="dashboard__link-label">Admin</span>
                    </button>
                )}
                {isAdmin && (
                    <button
                        className={activeNav === 'audit' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('audit')}
                        title="Audit log"
                    >
                        <FileText size={16} />
                        <span className="dashboard__link-label">Audit log</span>
                    </button>
                )}
                {isAdmin && (
                    <button
                        className={activeNav === 'security' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => onNavSelect('security')}
                        title="Security"
                    >
                        <ShieldCheck size={16} />
                        <span className="dashboard__link-label">Security</span>
                    </button>
                )}
            </nav>
        </aside>

        <div className="dashboard__content">
            <div className="dashboard__topbar">
                <div>
                    <h1>{heading}</h1>
                    {subheading && <p>{subheading}</p>}
                </div>
            </div>
            {children}
        </div>
    </div>
    );
};

export default DashboardLayout;
