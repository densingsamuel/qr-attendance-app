"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./scan.module.css";
import {
    calculateDistance,
    SHOP_LOCATION,
    MAX_DISTANCE_METERS,
    isWithinTimeWindow,
    calculateLateDuration
} from "@/lib/attendance";

import { supabase } from "@/lib/supabase";

export default function ScanPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>("Checking location...");
    const [staffRecords, setStaffRecords] = useState<any[]>([]);
    const [shopName, setShopName] = useState("QR Attend");
    const router = useRouter();

    useEffect(() => {
        const storedShop = localStorage.getItem("attendance_shop_name");
        if (storedShop) setShopName(storedShop);

        const init = async () => {
            // 1. Check Time Window
            if (!isWithinTimeWindow()) {
                setError("Attendance window (08:45 AM - 09:30 AM) is closed.");
                setLoading(false);
                return;
            }

            // 2. Fetch Staff Records from Supabase
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('*')
                .eq('status', 'Active')
                .order('name');

            if (staffError) {
                setError("Failed to load staff list. Please check your internet.");
                setLoading(false);
                return;
            }
            setStaffRecords(staffData || []);

            // 3. Check Geolocation
            if (!navigator.geolocation) {
                setError("Geolocation is not supported by your browser.");
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Anti-Spoofing: Check if accuracy is very poor (likely mock location or just IP-based)
                    if (position.coords.accuracy > 150) {
                        setError("Location accuracy too low. Please go outside or disable mock locations/VPN to get a real GPS fix.");
                        setLoading(false);
                        return;
                    }

                    const distance = calculateDistance(
                        position.coords.latitude,
                        position.coords.longitude,
                        SHOP_LOCATION.lat,
                        SHOP_LOCATION.lng
                    );

                    if (distance > MAX_DISTANCE_METERS) {
                        setError("You are not inside shop location. Attendance cannot be recorded.");
                        setLoading(false);
                    } else {
                        setLoading(false);
                        setStatus(null);
                    }
                },
                (err) => {
                    console.error(err);
                    setError("Please enable High-Accuracy GPS location to mark attendance.");
                    setLoading(false);
                },
                {
                    enableHighAccuracy: true, // Force hardware GPS
                    maximumAge: 0,            // Force a live reading, no caching
                    timeout: 15000            // Give it 15s to get a real fix
                }
            );
        };

        init();
    }, []);

    const handleMarkAttendance = async (staff: any) => {
        // 1. Strict Device Binding: Lock hardware to a specific staff member
        const registeredStaffId = localStorage.getItem("registered_staff_id");

        if (registeredStaffId && parseInt(registeredStaffId) !== staff.id) {
            setError(`SECURITY ALERT: This device is already registered to another user (ID: ${registeredStaffId}). You cannot use a friend's phone to check in.`);
            return;
        }

        // 2. One attendance per day rule
        const deviceAttendance = localStorage.getItem("attendance_marked_today");
        const todayStr = new Date().toDateString();

        if (deviceAttendance === todayStr) {
            setError("You have already marked attendance today.");
            return;
        }

        // Record attendance in Supabase
        setLoading(true);
        setStatus(`Recording attendance for ${staff.name}...`);

        // Calculate lateness
        const now = new Date();
        const lateDuration = calculateLateDuration(now, staff.shift || "09:00 AM");
        const attendanceStatus = lateDuration ? 'Late' : 'Present';

        const { error: attError } = await supabase
            .from('attendance')
            .insert([{
                staff_id: staff.id,
                staff_name: staff.name,
                status: attendanceStatus,
                date: now.toISOString().split('T')[0],
                check_in: now.toISOString(),
                late_duration: lateDuration,
                device_id: 'LOCAL_BROWSER_' + todayStr // Simple fingerprint for now
            }]);

        if (attError) {
            alert("Failed to record attendance: " + attError.message);
            setLoading(false);
            return;
        }

        // Lock the device to this staff member permanently
        if (!registeredStaffId) {
            localStorage.setItem("registered_staff_id", staff.id.toString());
        }

        localStorage.setItem("attendance_marked_today", todayStr);
        const attendanceData = {
            staffName: staff.name,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
            isLate: !!lateDuration,
            lateDuration: lateDuration
        };

        // Store success data temporarily
        sessionStorage.setItem("last_attendance", JSON.stringify(attendanceData));
        router.push("/scan/success");
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>{status || "Verifying securely..."}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.scanPage}>
                <div className={styles.header}>
                    <div className={styles.shopName}>{shopName}</div>
                </div>
                <div className={`${styles.statusMessage} ${styles.error}`} style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Access Denied</h2>
                    <p>{error}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                    <button className="btn btn-outline" style={{ width: '200px' }} onClick={() => window.location.reload()}>
                        🔄 Refresh & Try Again
                    </button>
                    <button
                        className="btn btn-primary"
                        style={{ background: '#666', border: 'none', width: '200px', fontSize: '0.8rem' }}
                        onClick={() => { localStorage.removeItem("attendance_marked_today"); window.location.reload(); }}
                    >
                        🛠️ Reset Lock (Demo Only)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.scanPage}>
            <div className={styles.header}>
                <div className={styles.shopName}>{shopName}</div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Staff Check-in</h1>
                <p className={styles.instruction}>Step 1: Verify Location ✔️</p>
                <p className={styles.instruction}>Step 2: Tap your face below to mark attendance</p>
            </div>

            <div className={styles.grid}>
                {staffRecords.length === 0 ? (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: '1rem' }}>
                        No active staff members found. Please check Staff Management.
                    </p>
                ) : staffRecords.map((staff) => (
                    <div key={staff.id} className={styles.staffCard} onClick={() => handleMarkAttendance(staff)}>
                        <div className={styles.photoContainer}>
                            <img src={staff.photo_url || "https://i.pravatar.cc/150?u=none"} alt={staff.name} className={styles.staffPhoto} />
                        </div>
                        <div className={styles.staffName}>{staff.name}</div>
                    </div>
                ))}
            </div>

            <div className={`${styles.statusMessage} ${styles.info}`}>
                <p>📍 Shop Location Verified: <strong>Within 50m</strong></p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', opacity: 0.8 }}>Security: Device ID Locked</p>
            </div>
        </div>
    );
}
