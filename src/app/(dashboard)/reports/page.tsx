"use client";

import { useState, useEffect } from "react";
import styles from "@/components/Dashboard/Dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { sumDurations } from "@/lib/attendance";

export default function ReportsPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-03"
    const [reportData, setReportData] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [staffDetails, setStaffDetails] = useState<any[]>([]);

    useEffect(() => {
        fetchReport();
    }, [selectedMonth]);

    const fetchReport = async () => {
        setLoading(true);

        // 1. Fetch all active staff
        const { data: staffData } = await supabase.from('staff').select('*').eq('status', 'Active');
        const staff = staffData || [];
        setStaffList(staff);

        // 2. Fetch all attendance for this month
        const startDate = `${selectedMonth}-01`;
        const nextMonth = new Date(selectedMonth + "-01");
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endDate = nextMonth.toISOString().split('T')[0];

        const { data: attData } = await supabase
            .from('attendance')
            .select('*')
            .gte('date', startDate)
            .lt('date', endDate);

        const attendance = attData || [];

        // 3. Aggregate data per staff
        const aggregated = staff.map(s => {
            const staffAtt = attendance.filter(a => a.staff_id === s.id);
            const present = staffAtt.filter(a => a.status === 'Present').length;
            const holidays = staffAtt.filter(a => a.status === 'Holiday').length;
            const halfDays = staffAtt.filter(a => a.status === 'Half Day').length;
            const lateCount = staffAtt.filter(a => a.status === 'Late').length;
            const leaves = staffAtt.filter(a => a.status === 'Leave').length;

            // Calculate late duration
            const lateDurations = staffAtt.map(a => a.late_duration);
            const totalLateDuration = sumDurations(lateDurations);

            return {
                id: s.id,
                name: s.name,
                present: present + holidays + halfDays + lateCount,
                late: lateCount,
                lateDuration: totalLateDuration,
                absent: leaves,
                leaveAllowance: s.leave_allowance || 2,
                totalWorkingDays: 26,
                allRecords: staffAtt
            };
        });

        setReportData(aggregated);
        setLoading(false);
    };

    const handleExportCSV = () => {
        alert("Downloading CSV report for " + selectedMonth);
    };

    const handleExportPDF = () => {
        alert("Downloading PDF report for " + selectedMonth);
    };

    return (
        <>
            <div className={styles.dashboardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.dashboardTitle}>Monthly Attendance Reports</h1>
                    <p className={styles.dashboardSubtitle}>View staff presence, late duration, and leave balances.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={handleExportCSV}>
                        📥 Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleExportPDF}>
                        📄 Export PDF
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', maxWidth: '400px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Select Month</label>
                    <input
                        type="month"
                        className="card"
                        style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" style={{ padding: '0.8rem 1.5rem' }} onClick={fetchReport}>
                    Filter Report
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Staff</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                        {loading ? '...' : staffList.length}
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Monthly Attendance</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>
                        {loading ? '...' : (reportData.length ? Math.round(reportData.reduce((acc, r) => acc + (r.present / r.totalWorkingDays), 0) / reportData.length * 100) : 0)}%
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Leaves Taken</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--error)', marginTop: '0.5rem' }}>
                        {loading ? '...' : reportData.reduce((acc, r) => acc + r.absent, 0)}
                    </div>
                </div>
            </div>

            <div className={`${styles.tableSection} card`}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Staff Name</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Present</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Late (Count)</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Late Duration</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Leaves Used / Allowance</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className={styles.spinner} style={{ margin: '0 auto 1rem' }}></div>
                                        Calculating monthly aggregates...
                                    </td>
                                </tr>
                            ) : reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No data found for this month.
                                    </td>
                                </tr>
                            ) : reportData.map((row) => (
                                <tr key={row.id}>
                                    <td className={styles.td}>
                                        <span style={{ fontWeight: 600 }}>{row.name}</span>
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>
                                        {row.present} / {row.totalWorkingDays}
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>
                                        {row.late}
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 'bold' }}>
                                        {row.lateDuration}
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: row.absent > row.leaveAllowance ? '#fff1f2' : '#f0fdf4',
                                            color: row.absent > row.leaveAllowance ? '#be123c' : '#15803d',
                                            fontWeight: 'bold'
                                        }}>
                                            {row.absent} / {row.leaveAllowance}
                                        </span>
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>
                                        <button
                                            className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={() => {
                                                setSelectedStaff(row);
                                                setStaffDetails(row.allRecords);
                                            }}
                                        >
                                            👁️ View Days
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedStaff && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem' }}>Attendance Details: {selectedStaff.name}</h2>
                                <p style={{ color: 'var(--text-muted)' }}>Records for {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                            </div>
                            <button className="btn btn-outline" onClick={() => setSelectedStaff(null)}>Close</button>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.th}>Date</th>
                                        <th className={styles.th}>Check-in Time</th>
                                        <th className={styles.th}>Status</th>
                                        <th className={styles.th}>Lateness</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No records for this month</td>
                                        </tr>
                                    ) : staffDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((day, idx) => (
                                        <tr key={idx}>
                                            <td className={styles.td}>{new Date(day.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                                            <td className={styles.td}>
                                                {day.check_in ? new Date(day.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className={styles.td}>
                                                <span className={`status-badge ${day.status === "Present" ? "status-present" :
                                                    day.status === "Half Day" ? "status-halfday" :
                                                        day.status === "Late" ? "status-halfday" : "status-leave"
                                                    }`}
                                                    style={day.status === "Late" ? { backgroundColor: '#fff7ed', color: '#c2410c' } : {}}
                                                >
                                                    {day.status}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <span style={{ fontWeight: 600, color: 'var(--error)' }}>
                                                    {day.late_duration || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Showing monthly aggregates for {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
        </>
    );
}
