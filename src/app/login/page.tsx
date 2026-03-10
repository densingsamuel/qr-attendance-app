"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
    const [shopName, setShopName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Save shop name and owner info to simulate login state
        localStorage.setItem("attendance_shop_name", shopName || "My Shop");
        localStorage.setItem("attendance_owner_email", email);
        localStorage.setItem("attendance_owner_name", ownerName || "Shop Owner");

        // Simulate login
        setTimeout(() => {
            setLoading(false);
            router.push("/dashboard");
        }, 1000);
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <div className={styles.logo}>QR Attend</div>
                    <h1 className={styles.title}>Welcome Back</h1>
                    <p className={styles.label}>Sign in to your owner dashboard</p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="ownerName">Your Full Name (Owner)</label>
                        <input
                            className={styles.input}
                            type="text"
                            id="ownerName"
                            placeholder="e.g. Jane Doe"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="shopName">Shop Name</label>
                        <input
                            className={styles.input}
                            type="text"
                            id="shopName"
                            placeholder="e.g. Royal Fresh Mart"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="email">Email or Phone</label>
                        <input
                            className={styles.input}
                            type="text"
                            id="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="password">Password</label>
                        <input
                            className={styles.input}
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary loginButton"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Create Account & Login"}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>© 2026 QR Attendance System</p>
                </div>
            </div>
        </div>
    );
}
