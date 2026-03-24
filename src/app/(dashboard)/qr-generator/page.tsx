"use client";

import { useState, useEffect } from "react";
import styles from "@/components/Dashboard/Dashboard.module.css";

export default function QRGeneratorPage() {
    const [shopName, setShopName] = useState("QR Attend");
    const [baseUrl, setBaseUrl] = useState("");

    useEffect(() => {
        const storedShop = localStorage.getItem("attendance_shop_name");
        if (storedShop) setShopName(storedShop);
        setBaseUrl(window.location.origin);
    }, []);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const todayDate = new Date().toISOString().split('T')[0];
    const fullScanUrl = `${baseUrl}/scan?date=${todayDate}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullScanUrl)}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `attendance_qr_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Failed to download QR code", error);
            alert("Failed to download QR code. Please try again.");
        }
    };

    const handleWhatsAppShare = () => {
        const message = encodeURIComponent(`QR ATTENDANCE for ${shopName}\n\nStaff can mark attendance here: ${fullScanUrl}\n\n(Remember: You must be at the shop for this link to work!)`);
        window.open(`https://wa.me/?text=${message}`, "_blank");
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(fullScanUrl);
        alert("Check-in Link copied to clipboard!");
    };

    return (
        <>
            <div className={styles.dashboardHeader}>
                <h1 className={styles.dashboardTitle}>{shopName} Attendance Link</h1>
                <p className={styles.dashboardSubtitle}>Share this link with your staff so they can mark attendance without scanning.</p>
            </div>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Attendance for <strong>{today}</strong>
                </p>

                <div style={{
                    background: '#f1f5f9',
                    width: '300px',
                    height: '300px',
                    margin: '0 auto',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed var(--border)',
                    marginBottom: '2rem'
                }}>
                    {/* Mock QR Code */}
                    <div style={{
                        width: '240px',
                        height: '240px',
                        background: 'white',
                        padding: '1rem',
                        boxShadow: 'var(--shadow-md)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <img
                            src={qrUrl}
                            alt="Attendance QR Code"
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Direct Check-in Link</h3>
                    <div style={{
                        background: 'var(--bg-main)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        color: 'var(--primary)',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all',
                        marginBottom: '1rem'
                    }}>
                        {baseUrl ? fullScanUrl : 'Loading...'}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Staff can simply open this link on their phones to see the "Tap your face" screen.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <button className="btn btn-primary" onClick={handleDownload} style={{ gridColumn: 'span 2' }}>
                        Download QR Flyer
                    </button>
                    <button className="btn btn-outline" style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }} onClick={handleWhatsAppShare}>
                        WhatsApp Group
                    </button>
                    <button className="btn btn-outline" onClick={handleCopyLink}>
                        🔗 Copy Link
                    </button>
                </div>

                <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--primary)' }}>
                        💡 Instruction:
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#065f46' }}>
                        Send this QR to your staff WhatsApp group for today&apos;s attendance. The QR changes daily for security.
                    </p>
                </div>
            </div>
        </>
    );
}
