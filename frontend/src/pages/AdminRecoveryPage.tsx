import React from 'react';

type AdminRecoveryPageProps = {
    onBack: () => void;
};

const AdminRecoveryPage: React.FC<AdminRecoveryPageProps> = ({ onBack }) => {
    return (
        <main className="auth-page">
            <div className="auth-card" style={{ maxWidth: 560 }}>
                <div className="auth-card__header">
                    <span className="auth-card__brand"><img src="/logo-removebg-preview.png" alt="" className="brand-logo brand-logo--sm" /> LedgRx</span>
                    <span className="auth-card__eyebrow">Emergency recovery</span>
                </div>
                <h2>Admin account recovery</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                    Use these steps if the admin passkey device is lost and no backup passkey was registered.
                    You will need SSH access to the VPS.
                </p>

                <ol style={{ fontSize: '0.85rem', lineHeight: 1.8, paddingLeft: 20 }}>
                    <li>
                        SSH into the VPS:
                        <pre style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, margin: '6px 0', fontSize: '0.8rem', overflowX: 'auto' }}>
                            ssh christopher@ledgrx.duckdns.org
                        </pre>
                    </li>
                    <li>
                        Open a MongoDB shell:
                        <pre style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, margin: '6px 0', fontSize: '0.8rem', overflowX: 'auto' }}>
                            cd /opt/ledgrx/comp-3000-repository{'\n'}
                            docker compose -f blockchain/docker-compose.backend.yml exec mongo mongosh ledgrx
                        </pre>
                    </li>
                    <li>
                        Delete the admin's passkey credentials:
                        <pre style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, margin: '6px 0', fontSize: '0.8rem', overflowX: 'auto' }}>
                            {'db.webauthn_credentials.deleteMany({ userType: "platform" })'}
                        </pre>
                    </li>
                    <li>
                        Delete the admin user record:
                        <pre style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, margin: '6px 0', fontSize: '0.8rem', overflowX: 'auto' }}>
                            {'db.users.deleteMany({ isAdmin: true })'}
                        </pre>
                    </li>
                    <li>
                        Exit the shell (<code>exit</code>), then navigate to{' '}
                        <strong>/setup</strong> to re-bootstrap the admin account with a new passkey.
                    </li>
                </ol>

                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 16 }}>
                    Note: re-bootstrapping does not affect organisations, workers, or medication records.
                    Only the platform admin account is reset.
                </p>

                <div className="auth-card__actions" style={{ marginTop: 20 }}>
                    <button className="button button--ghost" onClick={onBack}>
                        Back to staff login
                    </button>
                </div>
            </div>
        </main>
    );
};

export default AdminRecoveryPage;
