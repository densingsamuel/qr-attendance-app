"use client";

import { useState, useEffect } from "react";
import styles from "@/components/Dashboard/Dashboard.module.css";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { label: "Today's Present Staff", value: "0", color: "var(--success)" },
        { label: "Half Day", value: "0", color: "var(--warning)" },
        { label: "Leave", value: "0", color: "var(--error)" },
        { label: "Total Staff", value: "0", color: "var(--text-main)" },
    ]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch Staff (to get photos and total count)
        const { data: staffData } = await supabase.from('staff').select('*').eq('status', 'Active');
        const staff = staffData || [];
        setStaffList(staff);

        // 2. Fetch Today's Attendance
        const { data: attData } = await supabase.from('attendance').select('*').eq('date', todayStr);
        const attendance = attData || [];

        // 3. Merge data (map photo from staff to attendance)
        const mergedList = attendance.map(att => {
            const s = staff.find(staffMember => staffMember.id === att.staff_id);
            return {
                ...att,
                photo_url: s?.photo_url || "https://i.pravatar.cc/150?u=none"
            };
        });
        setAttendanceList(mergedList);

        // 4. Calculate Stats
        const presentCount = attendance.filter(a => a.status === 'Present').length;
        const halfDayCount = attendance.filter(a => a.status === 'Half Day').length;
        const leaveCount = attendance.filter(a => a.status === 'Leave').length;

        setStats([
            { label: "Today's Present Staff", value: presentCount.toString(), color: "var(--success)" },
            { label: "Half Day", value: halfDayCount.toString(), color: "var(--warning)" },
            { label: "Leave", value: leaveCount.toString(), color: "var(--error)" },
            { label: "Total Staff", value: staff.length.toString(), color: "var(--text-main)" },
        ]);

        setLoading(false);
    };

    const handleEdit = (entry: any) => {
        setEditingEntry(entry);
    };

    const handleSave = async () => {
        if (editingEntry) {
            const { error } = await supabase
                .from('attendance')
                .update({ status: editingEntry.status })
                .eq('id', editingEntry.id);

            if (error) {
                alert("Error updating attendance: " + error.message);
            } else {
                fetchData(); // Refresh
                setEditingEntry(null);
            }
        }
    };

    return (
        <>
            <div className={styles.dashboardHeader}>
                <h1 className={styles.dashboardTitle}>Dashboard Overview</h1>
                <p className={styles.dashboardSubtitle}>Good morning, here is what's happening today.</p>
            </div>

            <div className={styles.statsGrid}>
                {stats.map((stat, index) => (
                    <div key={index} className={`${styles.statCard} card`}>
                        <span className={styles.statLabel}>{stat.label}</span>
                        <span className={styles.statValue} style={{ color: stat.color }}>{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className={`${styles.tableSection} card`}>
                <h2 className={styles.tableTitle}>Today's Attendance</h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Staff Name</th>
                                <th className={styles.th}>Check-in Time</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className={styles.spinner} style={{ margin: '0 auto 1rem' }}></div>
                                        Fetching live attendance...
                                    </td>
                                </tr>
                            ) : attendanceList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No attendance recorded for today yet.
                                    </td>
                                </tr>
                            ) : attendanceList.map((row) => (
                                <tr key={row.id}>
                                    <td className={styles.td}>
                                        <div className={styles.staffCell}>
                                            <img src={row.photo_url} alt={row.staff_name} className={styles.staffPhoto} />
                                            <span style={{ fontWeight: 500 }}>{row.staff_name}</span>
                                        </div>
                                    </td>
                                    <td className={styles.td}>
                                        {row.check_in ? new Date(row.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className={styles.td}>
                                        <span className={`status-badge ${row.status === "Present" ? "status-present" :
                                            row.status === "Half Day" ? "status-halfday" :
                                                row.status === "Holiday" ? "status-halfday" : "status-leave"
                                            }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className={styles.td}>
                                        <button
                                            className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={() => handleEdit(row)}
                                        >Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingEntry && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Update Attendance</h2>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Updating attendance for <strong>{editingEntry.staff_name}</strong></p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Status</label>
                                <select
                                    className="card"
                                    style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                                    value={editingEntry.status}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, status: e.target.value })}
                                >
                                    <option value="Present">Present</option>
                                    <option value="Half Day">Half Day</option>
                                    <option value="Leave">Leave</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingEntry(null)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Update</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
