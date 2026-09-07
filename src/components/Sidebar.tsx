"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABEL } from "@/lib/meta";
import { logout } from "@/app/actions";

type SidebarUser = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

const NAV_ITEMS = [
  { href: "/", label: "Alla ärenden", icon: "\u{1F4C1}" },
  { href: "/pagaende", label: "Pågående ärenden", icon: "\u{1F5C2}\u{FE0F}" },
  { href: "/tillstand", label: "Tillstånd", icon: "\u{1F4DC}" },
  { href: "/statistik", label: "Statistik", icon: "\u{1F4CA}" },
];

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo-mark">BK</span>
        <div>
          <strong>BUKO Sverige</strong>
          <span>Ärendehantering</span>
        </div>
      </div>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? "active" : ""}`}
        >
          <span className="dot" />
          {item.icon} {item.label}
        </Link>
      ))}

      {(user.role === "PL" || user.role === "ADMIN") && (
        <Link href="/skapa" className={`nav-item ${pathname === "/skapa" ? "active" : ""}`}>
          <span className="dot" />➕ Skapa ärende
        </Link>
      )}

      {user.role === "ADMIN" && (
        <Link href="/anvandare" className={`nav-item ${pathname === "/anvandare" ? "active" : ""}`}>
          <span className="dot" />👤 Användare
        </Link>
      )}

      <div className="sidebar-footer">
        <div className="current-user">
          <span className="avatar">{user.initials}</span>
          <span>
            <div className="current-user-name">{user.name}</div>
            <div className="current-user-role">{ROLE_LABEL[user.role]}</div>
          </span>
        </div>
        <form action={logout}>
          <button type="submit" className="switch-user-btn">
            Logga ut
          </button>
        </form>
      </div>
    </aside>
  );
}
