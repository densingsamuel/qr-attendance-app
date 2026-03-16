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
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);

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
                phone: s.phone,
                shift: s.shift,
                present: present + holidays + halfDays + lateCount,
                halfDays,
                late: lateCount,
                lateDuration: totalLateDuration,
                absent: leaves,
                holidays,
                leaveAllowance: s.leave_allowance || 2,
                totalWorkingDays: 26,
                allRecords: staffAtt
            };
        });

        setReportData(aggregated);
        setLoading(false);
    };

    const getMonthLabel = () => {
        return new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getShopName = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("attendance_shop_name") || "QR Attend";
        }
        return "QR Attend";
    };

    // Helper: load external script dynamically
    const loadScript = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    };

    // ---- PDF Export ----
    const handleExportPDF = async () => {
        if (reportData.length === 0) {
            alert("No data to export.");
            return;
        }

        setExportingPDF(true);

        try {
            // Load jsPDF and jspdf-autotable via CDN to avoid bundler/module compatibility issues
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.3/jspdf.plugin.autotable.min.js');

            const { jsPDF } = (window as any).jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const shopName = getShopName();
            const monthLabel = getMonthLabel();
            let y = 15;

            // ========== COVER HEADER ==========
            doc.setFillColor(8, 160, 69);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(shopName, pageWidth / 2, 18, { align: 'center' });
            doc.setFontSize(13);
            doc.setFont('helvetica', 'normal');
            doc.text(`Monthly Attendance Report - ${monthLabel}`, pageWidth / 2, 30, { align: 'center' });

            doc.setTextColor(100, 100, 100);
            doc.setFontSize(9);
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 50, { align: 'center' });

            // ========== OVERALL STATS ==========
            y = 60;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Overall Summary', 14, y);
            y += 8;

            const totalPresent = reportData.reduce((a: number, r: any) => a + r.present, 0);
            const totalAbsent = reportData.reduce((a: number, r: any) => a + r.absent, 0);
            const totalLate = reportData.reduce((a: number, r: any) => a + r.late, 0);
            const avgAttendance = reportData.length ? Math.round((totalPresent / (reportData.length * 26)) * 100) : 0;

            doc.autoTable({
                startY: y,
                head: [['Total Staff', 'Total Present Days', 'Total Absent Days', 'Total Late Count', 'Avg Attendance %']],
                body: [[String(reportData.length), String(totalPresent), String(totalAbsent), String(totalLate), `${avgAttendance}%`]],
                theme: 'grid',
                headStyles: { fillColor: [8, 160, 69], textColor: 255, fontSize: 9, halign: 'center', fontStyle: 'bold' },
                bodyStyles: { fontSize: 11, halign: 'center', fontStyle: 'bold', textColor: [30, 41, 59] },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 12;

            // ========== STAFF SUMMARY TABLE ==========
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Staff-wise Summary', 14, y);
            y += 6;

            const summaryHead = ['#', 'Staff Name', 'Present', 'Half Day', 'Late', 'Late Duration', 'Leaves', 'Leave Balance'];
            const summaryBody = reportData.map((r: any, i: number) => [
                String(i + 1), r.name, `${r.present} / 26`, String(r.halfDays), String(r.late),
                r.lateDuration, String(r.absent), `${Math.max(0, r.leaveAllowance - r.absent)} / ${r.leaveAllowance}`
            ]);

            doc.autoTable({
                startY: y,
                head: [summaryHead],
                body: summaryBody,
                theme: 'striped',
                headStyles: { fillColor: [8, 160, 69], textColor: 255, fontSize: 8, halign: 'center', fontStyle: 'bold' },
                bodyStyles: { fontSize: 8, halign: 'center' },
                columnStyles: { 1: { halign: 'left' } },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 15;

            // ========== PER-STAFF DETAILED BREAKDOWN ==========
            for (let idx = 0; idx < reportData.length; idx++) {
                const staff = reportData[idx];
                const records = [...(staff.allRecords || [])].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (y > 230) { doc.addPage(); y = 15; }

                doc.setFillColor(240, 253, 244);
                doc.rect(14, y - 5, pageWidth - 28, 18, 'F');
                doc.setDrawColor(8, 160, 69);
                doc.rect(14, y - 5, pageWidth - 28, 18, 'S');
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text(`${idx + 1}. ${staff.name}`, 18, y + 2);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(`Present: ${staff.present} | Late: ${staff.late} (${staff.lateDuration}) | Absent: ${staff.absent} | Shift: ${staff.shift || 'N/A'}`, 18, y + 9);
                y += 18;

                if (records.length === 0) {
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.text('No attendance records for this month.', 18, y + 4);
                    y += 12;
                } else {
                    const detailBody = records.map((r: any) => {
                        const d = new Date(r.date);
                        return [
                            d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
                            d.toLocaleDateString('en-US', { weekday: 'short' }),
                            r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
                            r.status,
                            r.late_duration || '-',
                            r.device_id === 'ADMIN_MANUAL' ? 'Admin' : 'QR Scan'
                        ];
                    });

                    doc.autoTable({
                        startY: y,
                        head: [['Date', 'Day', 'Check-in Time', 'Status', 'Late Duration', 'Source']],
                        body: detailBody,
                        theme: 'grid',
                        headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 7.5, halign: 'center', fontStyle: 'bold' },
                        bodyStyles: { fontSize: 7.5, halign: 'center' },
                        columnStyles: { 0: { halign: 'left', cellWidth: 30 }, 1: { cellWidth: 18 }, 3: { fontStyle: 'bold' } },
                        margin: { left: 14, right: 14 },
                        didParseCell: function (data: any) {
                            if (data.column.index === 3 && data.section === 'body') {
                                const s = data.cell.raw;
                                if (s === 'Present') data.cell.styles.textColor = [22, 101, 52];
                                else if (s === 'Late') data.cell.styles.textColor = [194, 65, 12];
                                else if (s === 'Leave') data.cell.styles.textColor = [153, 27, 27];
                                else if (s === 'Half Day') data.cell.styles.textColor = [133, 77, 14];
                                else if (s === 'Holiday') data.cell.styles.textColor = [3, 105, 161];
                            }
                            if (data.column.index === 4 && data.section === 'body' && data.cell.raw !== '-') {
                                data.cell.styles.textColor = [239, 68, 68];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });
                    y = doc.lastAutoTable.finalY + 12;
                }
            }

            // ========== FOOTER ==========
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `${shopName} - Attendance Report - ${monthLabel} | Page ${i} of ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 8,
                    { align: 'center' }
                );
            }

            doc.save(`Attendance_Report_${selectedMonth}.pdf`);
        } catch (err: any) {
            console.error("PDF export error:", err);
            alert("Error generating PDF: " + err.message);
        }

        setExportingPDF(false);
    };

    // ---- CSV Export ----
    const handleExportCSV = () => {
        if (reportData.length === 0) {
            alert("No data to export.");
            return;
        }

        setExportingCSV(true);
        const shopName = getShopName();
        const monthLabel = getMonthLabel();

        let csvContent = `${shopName} - Attendance Report - ${monthLabel}\n\n`;

        // Summary section
        csvContent += 'STAFF SUMMARY\n';
        csvContent += 'Staff Name,Present Days,Half Days,Late Count,Total Late Duration,Leaves Used,Leave Allowance,Leave Balance\n';
        reportData.forEach(r => {
            csvContent += `"${r.name}",${r.present},${r.halfDays},${r.late},"${r.lateDuration}",${r.absent},${r.leaveAllowance},${Math.max(0, r.leaveAllowance - r.absent)}\n`;
        });

        csvContent += '\n\nDETAILED DAILY RECORDS\n';
        csvContent += 'Staff Name,Date,Day,Check-in Time,Status,Late Duration,Source\n';

        reportData.forEach(staff => {
            const records = [...(staff.allRecords || [])].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            records.forEach((r: any) => {
                const d = new Date(r.date);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const dateFormatted = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
                const source = r.device_id === 'ADMIN_MANUAL' ? 'Admin' : 'QR Scan';
                csvContent += `"${staff.name}","${dateFormatted}","${dayName}","${checkIn}","${r.status}","${r.late_duration || '-'}","${source}"\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Attendance_Report_${selectedMonth}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        setExportingCSV(false);
    };

    return (
        <>
            <div className={styles.dashboardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.dashboardTitle}>Monthly Attendance Reports</h1>
                    <p className={styles.dashboardSubtitle}>View staff presence, late duration, and leave balances.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={handleExportCSV} disabled={exportingCSV}>
                        {exportingCSV ? '⏳ Exporting...' : '📥 Export CSV'}
                    </button>
                    <button className="btn btn-primary" onClick={handleExportPDF} disabled={exportingPDF}>
                        {exportingPDF ? '⏳ Generating...' : '📄 Export PDF'}
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
