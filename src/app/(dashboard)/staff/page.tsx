"use client";

import { useState, useEffect } from "react";
import styles from "@/components/Dashboard/Dashboard.module.css";
import { supabase } from "@/lib/supabase";

const TimePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    // value format: "09:00 AM"
    const [timePart, ampmPart] = value ? value.split(' ') : ["09:00", "AM"];
    const [h, m] = timePart ? timePart.split(':') : ["09", "00"];
    const ampm = ampmPart || "AM";

    const handleH = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(`${e.target.value}:${m} ${ampm}`);
    const handleM = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(`${h}:${e.target.value} ${ampm}`);
    const handleAmPm = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(`${h}:${m} ${e.target.value}`);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <select className="card" style={{ padding: '0.6rem', border: '1px solid var(--border)', flex: 1, minWidth: '60px' }} value={h || "09"} onChange={handleH}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                    ))}
                </select>
                <span>:</span>
                <select className="card" style={{ padding: '0.6rem', border: '1px solid var(--border)', flex: 1, minWidth: '60px' }} value={m || "00"} onChange={handleM}>
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                    ))}
                </select>
                <select className="card" style={{ padding: '0.6rem', border: '1px solid var(--border)', flex: 1, minWidth: '65px' }} value={ampm} onChange={handleAmPm}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
        </div>
    );
};

export default function StaffPage() {
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchStaff();
        initStorage();
    }, []);

    const initStorage = async () => {
        // Try to create the bucket if it doesn't exist (might fail if not authorized, but worth a try)
        await supabase.storage.createBucket('staff-photos', { public: true });
    };

    const fetchStaff = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching staff:', error);
        } else {
            setStaff(data || []);
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
            .from('staff-photos')
            .upload(filePath, file);

        if (uploadError) {
            alert("Error uploading image: " + uploadError.message + "\n\nTip: Make sure you have created a 'staff-photos' bucket in Supabase Storage and set it to Public.");
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('staff-photos')
            .getPublicUrl(filePath);

        setEditingStaff({ ...editingStaff, photo_url: publicUrl });
        setUploading(false);
    };

    const handleEdit = (s: any) => {
        let startTime = "09:00 AM";
        let endTime = "06:00 PM";
        if (s.shift && s.shift.includes(' - ')) {
            const parts = s.shift.split(' - ');
            if (parts.length === 2) {
                startTime = parts[0];
                endTime = parts[1];
            }
        }
        setEditingStaff({ ...s, startTime, endTime, leaveAllowance: s.leave_allowance || 2 });
        setShowModal(true);
    };

    const handleAdd = () => {
        setUploading(false);
        setEditingStaff({ name: "", phone: "", startTime: "09:00 AM", endTime: "06:00 PM", photo_url: "", leave_allowance: 2 });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingStaff.photo_url) {
            alert("Please upload a staff photo first!");
            return;
        }

        const formattedShift = `${editingStaff.startTime} - ${editingStaff.endTime}`;
        const staffDataToSave = {
            name: editingStaff.name,
            phone: editingStaff.phone,
            shift: formattedShift,
            leave_allowance: editingStaff.leave_allowance,
            photo_url: editingStaff.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(editingStaff.name)}`,
            status: editingStaff.status || "Active"
        };

        if (editingStaff?.id) {
            // Edit existing
            const { error } = await supabase
                .from('staff')
                .update(staffDataToSave)
                .eq('id', editingStaff.id);

            if (error) alert("Error updating staff: " + error.message);
        } else {
            // Add new
            const { error } = await supabase
                .from('staff')
                .insert([staffDataToSave]);

            if (error) alert("Error adding staff: " + error.message);
        }

        fetchStaff(); // Refresh list
        setShowModal(false);
        setEditingStaff(null);
    };

    const handleDelete = async (id: any, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}? This will remove all their records forever.`)) {
            // 1. Delete associated attendance records first (due to foreign key constraint)
            const { error: attError } = await supabase
                .from('attendance')
                .delete()
                .eq('staff_id', id);

            if (attError) {
                alert("Error deleting associated attendance records: " + attError.message);
                return;
            }

            // 2. Delete the staff member
            const { error: staffError } = await supabase
                .from('staff')
                .delete()
                .eq('id', id);

            if (staffError) {
                alert("Error deleting staff: " + staffError.message);
            } else {
                fetchStaff();
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingStaff(null);
    };

    return (
        <>
            <div className={styles.dashboardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.dashboardTitle}>Staff Management</h1>
                    <p className={styles.dashboardSubtitle}>Manage your employees and their shifts.</p>
                </div>
                <button className="btn btn-primary" onClick={handleAdd}>
                    + Add Staff
                </button>
            </div>

            <div className={`${styles.tableSection} card`}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Photo</th>
                                <th className={styles.th}>Name</th>
                                <th className={styles.th}>Phone Number</th>
                                <th className={styles.th}>Shift Time</th>
                                <th className={styles.th}>Leave Allowance</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th}>Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className={styles.td} style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className={styles.spinner} style={{ margin: '0 auto 1rem' }}></div>
                                        Connecting to Supabase...
                                    </td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={styles.td} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No staff members found. Click "+ Add Staff" to get started.
                                    </td>
                                </tr>
                            ) : staff.map((row) => (
                                <tr key={row.id}>
                                    <td className={styles.td}>
                                        <img 
                                            src={row.photo_url || "https://i.pravatar.cc/150?u=none"} 
                                            alt={row.name} 
                                            className={styles.staffPhoto} 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`;
                                            }}
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <span style={{ fontWeight: 600 }}>{row.name}</span>
                                    </td>
                                    <td className={styles.td}>{row.phone}</td>
                                    <td className={styles.td}>{row.shift}</td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>{row.leave_allowance} Days</td>
                                    <td className={styles.td}>
                                        <span className="status-badge status-present">{row.status}</span>
                                    </td>
                                    <td className={styles.td}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                onClick={() => handleEdit(row)}
                                            >Edit</button>
                                            <button
                                                className="btn btn-outline"
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--error)',
                                                    borderColor: 'var(--error)'
                                                }}
                                                onClick={() => handleDelete(row.id, row.name)}
                                            >Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && editingStaff && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingStaff.id ? "Edit Staff" : "Add New Staff"}</h2>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleSave}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={editingStaff.photo_url || "https://i.pravatar.cc/150?u=none"}
                                        alt="Preview"
                                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', background: '#fff' }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(editingStaff.name || 'Staff')}&background=random`;
                                        }}
                                    />
                                    {uploading && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Staff Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="staff-photo-upload"
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="staff-photo-upload"
                                        className="btn btn-outline"
                                        style={{
                                            display: 'inline-block',
                                            textAlign: 'center',
                                            cursor: uploading ? 'not-allowed' : 'pointer',
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {uploading ? "⏳ Uploading..." : "📁 Choose from Computer"}
                                    </label>
                                    {!editingStaff.photo_url && !uploading && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--error)' }}>⚠️ Photo is required for attendance</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Staff Name</label>
                                <input
                                    type="text"
                                    className="card"
                                    style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                                    placeholder="Full Name"
                                    required
                                    value={editingStaff.name}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Phone Number</label>
                                <input
                                    type="tel"
                                    className="card"
                                    style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                                    placeholder="+91 XXXXX XXXXX"
                                    required
                                    value={editingStaff.phone}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Monthly Leave Allowance (Days)</label>
                                <input
                                    type="number"
                                    className="card"
                                    style={{ padding: '0.75rem', border: '1px solid var(--border)' }}
                                    min="0"
                                    max="30"
                                    required
                                    value={editingStaff.leave_allowance}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, leave_allowance: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <TimePicker
                                    label="Arriving Time"
                                    value={editingStaff.startTime}
                                    onChange={(val) => setEditingStaff({ ...editingStaff, startTime: val })}
                                />
                                <TimePicker
                                    label="Going Time"
                                    value={editingStaff.endTime}
                                    onChange={(val) => setEditingStaff({ ...editingStaff, endTime: val })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingStaff.id ? "Update Staff" : "Save Staff"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
