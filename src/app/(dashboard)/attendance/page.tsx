"use client";

import { useState, useEffect } from "react";
import styles from "@/components/Dashboard/Dashboard.module.css";
import { supabase } from "@/lib/supabase";

export default function AttendanceManagementPage() {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchAttendance();
    }, [filterDate]);

    const fetchAttendance = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', filterDate)
            .order('check_in', { ascending: false });

        if (error) {
            console.error('Error fetching attendance:', error);
        } else {
            setAttendance(data || []);
        }
        setLoading(false);
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        const { error } = await supabase
            .from('attendance')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert("Error updating status: " + error.message);
        } else {
            fetchAttendance();
        }
    };

    return (
        <>
            <div className={styles.dashboardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.dashboardTitle}>Attendance Records</h1>
                    <p className={styles.dashboardSubtitle}>View and manage staff attendance history.</p>
                </div>
                <button
                    className="btn btn-outline"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    onClick={() => alert("Holiday feature coming soon!")}
                >
                    🏖️ Mark Today as Shop Holiday
                </button>
            </div>

            <div className={`${styles.tableSection} card`}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <input
                        type="date"
                        className="card"
                        style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)' }}
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }} onClick={fetchAttendance}>Refresh</button>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Staff Name</th>
                                <th className={styles.th}>Date</th>
                                <th className={styles.th}>Check-in Time</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th}>Late Duration</th>
                                <th className={styles.th}>Change Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className={styles.spinner} style={{ margin: '0 auto' }}></div>
                                    </td>
                                </tr>
                            ) : attendance.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No records found for this date.
                                    </td>
                                </tr>
                            ) : attendance.map((row) => (
                                <tr key={row.id}>
                                    <td className={styles.td}>
                                        <span style={{ fontWeight: 600 }}>{row.staff_name}</span>
                                    </td>
                                    <td className={styles.td}>{row.date}</td>
                                    <td className={styles.td}>
                                        {row.check_in ? new Date(row.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className={styles.td}>
                                        <span className={`status-badge ${row.status === "Present" ? "status-present" :
                                            row.status === "Half Day" ? "status-halfday" :
                                                row.status === "Late" ? "status-halfday" :
                                                    row.status === "Holiday" ? "status-present" : "status-leave"
                                            }`}
                                            style={row.status === "Holiday" ? { backgroundColor: '#e0f2fe', color: '#0369a1' } :
                                                row.status === "Late" ? { backgroundColor: '#fff7ed', color: '#c2410c' } : {}}
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className={styles.td}>
                                        <span style={{ fontWeight: 600, color: 'var(--error)' }}>
                                            {row.late_duration || '-'}
                                        </span>
                                    </td>
                                    <td className={styles.td}>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                title="Present"
                                                onClick={() => handleStatusChange(row.id, "Present")}
                                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 'bold' }}
                                            >P</button>
                                            <button
                                                title="Half Day"
                                                onClick={() => handleStatusChange(row.id, "Half Day")}
                                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', borderRadius: '4px', background: '#fef9c3', color: '#854d0e', fontWeight: 'bold' }}
                                            >H</button>
                                            <button
                                                title="Leave"
                                                onClick={() => handleStatusChange(row.id, "Leave")}
                                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}
                                            >L</button>
                                            <button
                                                title="Shop Holiday"
                                                onClick={() => handleStatusChange(row.id, "Holiday")}
                                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }}
                                            >Hol</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
