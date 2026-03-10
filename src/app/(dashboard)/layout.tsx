import Navbar from "@/components/Dashboard/Navbar";
import styles from "@/components/Dashboard/Dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-container">
      <Navbar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
