"use client";

import { useState, useEffect } from "react";
import styles from "@/components/Dashboard/Dashboard.module.css";
import { supabase } from "@/lib/supabase";

// TimePicker component for check-in time selection
const TimePicker = ({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) => {
    const [timePart, ampmPart] = value ? value.split(' ') : ["09", "00 AM"];
    const [h, m] = timePart ? timePart.split(':') : ["09", "00"];
    const ampm = ampmPart || "AM";

    const handleH = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(`${e.target.value}:${m} ${ampm}`);
    const handleM = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(`${h}:${e.target.value} ${ampm}`);
    const handleAmPm = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(`${h}:${m} ${e.target.value}`);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <select className="card" style={{ padding: '0.6rem', border: '1px solid var(--border)', flex: 1, minWidth: '55px' }} value={h || "09"} onChange={handleH}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                    ))}
                </select>
                <span style={{ fontWeight: 600 }}>:</span>
                <select className="card" style={{ padding: '0.6rem', border: '1px solid var(--border)', flex: 1, minWidth: '55px' }} value={m || "00"} onChange={handleM}>
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                    ))}
                </select>
                <select className="card" style={{ padding: '0.6rem', border: '1px solid var(--border)', flex: 1, minWidth: '60px' }} value={ampm} onChange={handleAmPm}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
        </div>
    );
};

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

    // Admin Mark Attendance Modal State
    const [showMarkModal, setShowMarkModal] = useState(false);
    const [markForm, setMarkForm] = useState({
        staff_id: "",
        date: new Date().toISOString().split('T')[0],
        checkInTime: "09:00 AM",
        status: "Present",
    });
    const [markSubmitting, setMarkSubmitting] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

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

    // ---- Admin Mark Attendance Logic ----

    const openMarkModal = () => {
        setMarkForm({
            staff_id: "",
            date: new Date().toISOString().split('T')[0],
            checkInTime: "09:00 AM",
            status: "Present",
        });
        setDuplicateWarning(null);
        setShowMarkModal(true);
    };

    const parseTimeToISO = (dateStr: string, timeStr: string) => {
        // timeStr format: "09:00 AM"
        const [time, ampm] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const d = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
        return d.toISOString();
    };

    const handleMarkSubmit = async (forceOverwrite = false) => {
        if (!markForm.staff_id) {
            alert("Please select a staff member.");
            return;
        }
        if (!markForm.date) {
            alert("Please select a date.");
            return;
        }

        setMarkSubmitting(true);

        const selectedStaff = staffList.find(s => String(s.id) === String(markForm.staff_id));
        if (!selectedStaff) {
            alert("Staff not found.");
            setMarkSubmitting(false);
            return;
        }

        // Check for duplicate
        if (!forceOverwrite) {
            const { data: existing } = await supabase
                .from('attendance')
                .select('*')
                .eq('staff_id', markForm.staff_id)
                .eq('date', markForm.date);

            if (existing && existing.length > 0) {
                setDuplicateWarning(existing[0]);
                setMarkSubmitting(false);
                return;
            }
        }

        const checkInISO = parseTimeToISO(markForm.date, markForm.checkInTime);

        const attendanceData: any = {
            staff_id: selectedStaff.id,
            staff_name: selectedStaff.name,
            status: markForm.status,
            date: markForm.date,
            check_in: checkInISO,
            late_duration: null,
            device_id: 'ADMIN_MANUAL',
        };

        let error;

        if (forceOverwrite && duplicateWarning) {
            // Update existing record
            const result = await supabase
                .from('attendance')
                .update(attendanceData)
                .eq('id', duplicateWarning.id);
            error = result.error;
        } else {
            // Insert new record
            const result = await supabase
                .from('attendance')
                .insert([attendanceData]);
            error = result.error;
        }

        if (error) {
            alert("Error saving attendance: " + error.message);
        } else {
            setShowMarkModal(false);
            setDuplicateWarning(null);
            fetchData(); // Refresh dashboard
        }

        setMarkSubmitting(false);
    };

    return (
        <>
            <div className={styles.dashboardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.dashboardTitle}>Dashboard Overview</h1>
                    <p className={styles.dashboardSubtitle}>Good morning, here is what's happening today.</p>
                </div>
                <button
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                    onClick={openMarkModal}
                >
                    ✍️ Mark Attendance
                </button>
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
                                <th className={styles.th}>Source</th>
                                <th className={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className={styles.spinner} style={{ margin: '0 auto 1rem' }}></div>
                                        Fetching live attendance...
                                    </td>
                                </tr>
                            ) : attendanceList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
                                        {row.device_id === 'ADMIN_MANUAL' ? (
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: '#ede9fe',
                                                color: '#6d28d9'
                                            }}>
                                                👤 Admin
                                            </span>
                                        ) : (
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: '#e0f2fe',
                                                color: '#0369a1'
                                            }}>
                                                📱 QR Scan
                                            </span>
                                        )}
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

            {/* Edit Attendance Status Modal */}
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

            {/* Admin Mark Attendance Modal */}
            {showMarkModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{
                        width: '100%', maxWidth: '480px', padding: '2rem',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #08A045, #06c755)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', color: 'white'
                            }}>✍️</div>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Mark Attendance</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manually add attendance for any staff</p>
                            </div>
                        </div>

                        {/* Duplicate Warning */}
                        {duplicateWarning && (
                            <div style={{
                                padding: '1rem', borderRadius: 'var(--radius-md)',
                                background: '#fef3c7', border: '1px solid #f59e0b',
                                marginBottom: '1.25rem'
                            }}>
                                <p style={{ fontWeight: 600, color: '#92400e', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                                    ⚠️ Attendance Already Exists
                                </p>
                                <p style={{ color: '#78350f', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                    <strong>{duplicateWarning.staff_name}</strong> already has attendance for <strong>{duplicateWarning.date}</strong> (Status: {duplicateWarning.status}).
                                    <br />Do you want to overwrite it?
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                                        onClick={() => setDuplicateWarning(null)}
                                    >Cancel</button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', background: '#f59e0b' }}
                                        onClick={() => handleMarkSubmit(true)}
                                        disabled={markSubmitting}
                                    >{markSubmitting ? 'Saving...' : 'Yes, Overwrite'}</button>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        {!duplicateWarning && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Staff Selection */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Select Staff *</label>
                                    <select
                                        className="card"
                                        style={{ padding: '0.75rem', border: '1px solid var(--border)', cursor: 'pointer' }}
                                        value={markForm.staff_id}
                                        onChange={(e) => setMarkForm({ ...markForm, staff_id: e.target.value })}
                                    >
                                        <option value="">-- Choose a staff member --</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    {/* Staff Photo Preview */}
                                    {markForm.staff_id && (() => {
                                        const selected = staffList.find(s => String(s.id) === String(markForm.staff_id));
                                        if (!selected) return null;
                                        return (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                marginTop: '0.5rem', padding: '0.75rem',
                                                background: 'var(--background)', borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <img
                                                    src={selected.photo_url || "https://i.pravatar.cc/150?u=none"}
                                                    alt={selected.name}
                                                    style={{
                                                        width: '44px', height: '44px', borderRadius: '10px',
                                                        objectFit: 'cover', border: '2px solid var(--primary)'
                                                    }}
                                                />
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selected.name}</p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Shift: {selected.shift || 'Not set'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Date Selection */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Date *</label>
                                    <input
                                        type="date"
                                        className="card"
                                        style={{ padding: '0.75rem', border: '1px solid var(--border)', cursor: 'pointer' }}
                                        value={markForm.date}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                                    />
                                    {markForm.date !== new Date().toISOString().split('T')[0] && (
                                        <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 500 }}>
                                            📅 Backdated attendance entry
                                        </p>
                                    )}
                                </div>

                                {/* Check-in Time */}
                                <TimePicker
                                    label="Check-in Time"
                                    value={markForm.checkInTime}
                                    onChange={(val) => setMarkForm({ ...markForm, checkInTime: val })}
                                />

                                {/* Status */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Status *</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {[
                                            { value: 'Present', label: '✅ Present', bg: '#dcfce7', color: '#166534' },
                                            { value: 'Half Day', label: '🌗 Half Day', bg: '#fef9c3', color: '#854d0e' },
                                            { value: 'Late', label: '⏰ Late', bg: '#fff7ed', color: '#c2410c' },
                                            { value: 'Leave', label: '🚫 Leave', bg: '#fee2e2', color: '#991b1b' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setMarkForm({ ...markForm, status: opt.value })}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.825rem',
                                                    fontWeight: 600,
                                                    background: markForm.status === opt.value ? opt.color : opt.bg,
                                                    color: markForm.status === opt.value ? 'white' : opt.color,
                                                    border: `2px solid ${markForm.status === opt.value ? opt.color : 'transparent'}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    transform: markForm.status === opt.value ? 'scale(1.05)' : 'scale(1)',
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ flex: 1 }}
                                        onClick={() => { setShowMarkModal(false); setDuplicateWarning(null); }}
                                    >Cancel</button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{ flex: 1, fontWeight: 600 }}
                                        onClick={() => handleMarkSubmit(false)}
                                        disabled={markSubmitting}
                                    >
                                        {markSubmitting ? '⏳ Saving...' : '✅ Save Attendance'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
