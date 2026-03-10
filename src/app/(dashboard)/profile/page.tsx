"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/Dashboard/Dashboard.module.css";

export default function ProfilePage() {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Core profile data state
    const [shopName, setShopName] = useState("Royal Fresh Mart");
    const [userName, setUserName] = useState("Jane Doe");
    const [email, setEmail] = useState("jane.doe@example.com");

    useEffect(() => {
        // Load data on mount
        const storedShop = localStorage.getItem("attendance_shop_name");
        const storedOwner = localStorage.getItem("attendance_owner_name");
        const storedEmail = localStorage.getItem("attendance_owner_email");

        if (storedShop) setShopName(storedShop);
        if (storedOwner) setUserName(storedOwner);
        if (storedEmail) setEmail(storedEmail);
    }, []);

    const handleSave = () => {
        localStorage.setItem("attendance_shop_name", shopName);
        localStorage.setItem("attendance_owner_name", userName);
        localStorage.setItem("attendance_owner_email", email);

        // Dispatch custom event so Navbar updates instantly
        window.dispatchEvent(new Event("profile_updated"));
        setIsEditing(false);
    };

    const handleLogout = () => {
        // Clear auth data (simulate logout)
        localStorage.removeItem("attendance_shop_name");
        localStorage.removeItem("attendance_owner_name");
        localStorage.removeItem("attendance_owner_email");

        router.push("/login");
    };

    const setIsEditingSafe = (val: boolean) => {
        setIsEditing(val);
    };

    const getInitials = (name: string) => {
        if (!name) return "??";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const HelpModal = () => (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>How to Use This Software</h2>
                    <button className="btn btn-outline" onClick={() => setShowHelp(false)} style={{ padding: '0.4rem 0.8rem' }}>Close</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.6' }}>
                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>1. Initial Setup</h3>
                        <p>First, ensure your <strong>Shop Name</strong> and profile details are correct in this Profile section. The shop name is displayed on the staff scan page.</p>
                    </section>

                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>2. Managing Staff</h3>
                        <p>Go to the <strong>Staff</strong> page to add your employees. For each staff member:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li>Set their <strong>Arriving</strong> and <strong>Going</strong> shift times (12-hour format).</li>
                            <li>Assign a <strong>Monthly Leave Allowance</strong> (e.g., 2 days per month).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>3. QR Code Attendance</h3>
                        <p>Navigate to the <strong>QR Generator</strong> page daily. You can:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li><strong>Download</strong> the QR code to print or display at your shop entrance.</li>
                            <li><strong>Share via WhatsApp</strong> directly to your staff group.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>4. Staff Experience (Mobile)</h3>
                        <p>When staff members scan the QR code with their phones:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li>They select their <strong>Photo Card</strong> from the grid.</li>
                            <li>The system verifies their <strong>GPS Location</strong> (must be within 50m of the shop).</li>
                            <li>The system enforces <strong>Daily Limits</strong> (only one check-in per day/device).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>5. Tracking & Reports</h3>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li><strong>Dashboard:</strong> View real-time attendance for today.</li>
                            <li><strong>Reports:</strong> View monthly summaries. It tracks <strong>Late Duration</strong> (exactly how many hours/mins they were late) and monitors <strong>Leave Balances</strong> against the allowance you set.</li>
                        </ul>
                    </section>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', marginTop: '2.5rem' }} onClick={() => setShowHelp(false)}>
                    Got it, Thanks!
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div className={styles.dashboardHeader}>
                <h1 className={styles.dashboardTitle}>Owner Profile</h1>
                <p className={styles.dashboardSubtitle}>Manage your account and shop settings.</p>
            </div>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className={styles.avatar} style={{ width: '80px', height: '80px', fontSize: '1.5rem' }}>
                            {getInitials(userName)}
                        </div>
                        <div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="card"
                                    style={{ padding: '0.5rem', border: '1px solid var(--border)', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                />
                            ) : (
                                <h2 style={{ fontSize: '1.5rem' }}>{userName}</h2>
                            )}
                            <p style={{ color: 'var(--text-muted)' }}>Shop Owner</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Email Address</label>
                        {isEditing ? (
                            <input
                                type="email"
                                className="card"
                                style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        ) : (
                            <div className="card" style={{ padding: '0.75rem', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>{email}</div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Shop Name (Displayed on Header & Scan Page)</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="card"
                                style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                            />
                        ) : (
                            <div className="card" style={{ padding: '0.75rem', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>{shopName}</div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        {isEditing ? (
                            <>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Changes</button>
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                            </>
                        ) : (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>Edit Profile</button>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            className="btn btn-outline"
                            style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                            onClick={() => setShowHelp(true)}
                        >
                            ❓ How to Use (Help Guide)
                        </button>
                        <button
                            className="btn btn-outline"
                            style={{ color: 'var(--error)', borderColor: 'var(--error)', width: '100%' }}
                            onClick={handleLogout}
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            {showHelp && <HelpModal />}
        </>
    );
}
