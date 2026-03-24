"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Dashboard.module.css";

const menuItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Staff", path: "/staff" },
    { name: "Attendance", path: "/attendance" },
    { name: "QR Generator", path: "/qr-generator" },
    { name: "Reports", path: "/reports" },
    { name: "Profile", path: "/profile" },
];

export default function Navbar() {
    const pathname = usePathname();
    const [shopName, setShopName] = useState("QR Attend");
    const [userName, setUserName] = useState("Shop Owner");

    useEffect(() => {
        // Load initial data
        const loadProfileData = () => {
            const storedShop = localStorage.getItem("attendance_shop_name");
            const storedOwner = localStorage.getItem("attendance_owner_name");
            if (storedShop) setShopName(storedShop);
            if (storedOwner) setUserName(storedOwner);
        };

        loadProfileData();

        // Listen for storage changes across tabs
        window.addEventListener("storage", loadProfileData);
        // Custom event for same-tab updates (from Profile page)
        window.addEventListener("profile_updated", loadProfileData);

        return () => {
            window.removeEventListener("storage", loadProfileData);
            window.removeEventListener("profile_updated", loadProfileData);
        };
    }, []);

    // Get initials for avatars safely
    const getInitials = (name: string) => {
        if (!name) return "??";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <nav className={styles.nav}>
            <div className={styles.logo}>
                <div className={styles.avatar}>{getInitials(shopName)}</div>
                {shopName}
            </div>

            <div className={styles.navLinks}>
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`${styles.navLink} ${pathname === item.path ? styles.navLinkActive : ""}`}
                    >
                        {item.name}
                    </Link>
                ))}
            </div>

            <div className={styles.profile}>
                <div className={styles.avatar}>{getInitials(userName)}</div>
            </div>
        </nav>
    );
}
