"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    calculateDistance,
    SHOP_LOCATION,
    MAX_DISTANCE_METERS,
    isWithinStaffTimeWindow,
    calculateLateDuration
} from "@/lib/attendance";

export default function LitePage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Initializing...");
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            try {
                setStatus("Checking location...");
                // Check Location first
                if (!navigator.geolocation) {
                    throw new Error("GPS not supported");
                }

                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const dist = calculateDistance(
                            pos.coords.latitude,
                            pos.coords.longitude,
                            SHOP_LOCATION.lat,
                            SHOP_LOCATION.lng
                        );

                        if (dist > MAX_DISTANCE_METERS) {
                            setError("You are too far from the shop.");
                            setLoading(false);
                            return;
                        }

                        setStatus("Loading staff list...");
                        const { data, error: fetchErr } = await supabase
                            .from('staff')
                            .select('id, name, shift')
                            .eq('status', 'Active')
                            .order('name');

                        if (fetchErr) throw fetchErr;
                        setStaffList(data || []);
                        
                        // Auto-select if device is registered
                        const regId = localStorage.getItem("registered_staff_id");
                        if (regId) setSelectedStaffId(regId);

                        setLoading(false);
                        setStatus("");
                    },
                    (err) => {
                        setError("Please enable GPS/Location.");
                        setLoading(false);
                    },
                    { enableHighAccuracy: false, timeout: 10000 } // Faster, less accurate GPS for lite mode
                );
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleCheckIn = async () => {
        if (!selectedStaffId) return;
        setLoading(true);
        setStatus("Marking attendance...");

        const staff = staffList.find(s => String(s.id) === String(selectedStaffId));
        if (!staff) {
            setError("Staff not found");
            setLoading(false);
            return;
        }

        // Window check
        if (!isWithinStaffTimeWindow(staff.shift)) {
            setError(`Outside shift window (${staff.shift})`);
            setLoading(false);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Duplicate check
        const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('staff_id', staff.id)
            .eq('date', today);

        if (existing && existing.length > 0) {
            setError("Already marked today.");
            setLoading(false);
            return;
        }

        const now = new Date();
        const late = calculateLateDuration(now, staff.shift || "09:00 AM");
        
        const { error: insErr } = await supabase
            .from('attendance')
            .insert([{
                staff_id: staff.id,
                staff_name: staff.name,
                status: late ? 'Late' : 'Present',
                date: today,
                check_in: now.toISOString(),
                late_duration: late,
                device_id: 'LITE_MODE_' + today
            }]);

        if (insErr) {
            setError("Failed: " + insErr.message);
        } else {
            localStorage.setItem("registered_staff_id", staff.id.toString());
            setSuccess({
                name: staff.name,
                time: now.toLocaleTimeString()
            });
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: '4rem' }}>✅</div>
                <h1>Done!</h1>
                <p>{success.name}</p>
                <p>{success.time}</p>
                <button onClick={() => window.location.reload()} style={{ padding: '1rem', width: '100%', marginTop: '1rem' }}>Back</button>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '1.5rem', 
            maxWidth: '400px', 
            margin: '0 auto', 
            fontFamily: 'sans-serif',
            color: '#333'
        }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Lite Check-in</h1>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>Simplified mode for slow phones</p>

            {error && (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
                    <strong>Error:</strong> {error}
                    <button onClick={() => window.location.reload()} style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem' }}>Retry</button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner"></div>
                    <p>{status}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Your Name:</label>
                        <select 
                            value={selectedStaffId} 
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Select --</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleCheckIn}
                        disabled={!selectedStaffId}
                        style={{ 
                            padding: '1.25rem', 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold',
                            backgroundColor: selectedStaffId ? '#10b981' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Mark Attendance Now
                    </button>
                </div>
            )}

            <style jsx>{`
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border-left-color: #10b981;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
