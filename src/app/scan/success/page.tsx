"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../scan.module.css";

export default function SuccessPage() {
    const [data, setData] = useState<any>(null);
    const [shopName, setShopName] = useState("QR Attend");
    const router = useRouter();

    useEffect(() => {
        const storedShop = localStorage.getItem("attendance_shop_name");
        if (storedShop) setShopName(storedShop);

        const saved = sessionStorage.getItem("last_attendance");
        if (saved) {
            setData(JSON.parse(saved));
        } else {
            router.push("/scan");
        }
    }, [router]);

    if (!data) return null;

    return (
        <div className={styles.scanPage}>
            <div className={styles.header}>
                <div className={styles.shopName}>{shopName}</div>
            </div>

            <div className={`${styles.statusMessage} ${styles.info}`} style={{ marginTop: '5rem', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>{data.isLate ? '⏰' : '✅'}</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {data.isLate ? 'Attendance Marked (Late)' : 'Attendance Marked Successfully'}
                </h1>
                {data.isLate && (
                    <p style={{ color: 'var(--error)', fontWeight: 600, marginBottom: '1rem' }}>
                        You are late by {data.lateDuration}
                    </p>
                )}

                <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginTop: '2rem', textAlign: 'left', border: '1px solid #a7f3d0' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Staff Member</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>{data.staffName}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Time</p>
                            <p style={{ fontSize: '1rem', fontWeight: 600 }}>{data.time}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Date</p>
                            <p style={{ fontSize: '1rem', fontWeight: 600 }}>{data.date}</p>
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '2.5rem' }}
                    onClick={() => router.push("/scan")}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
