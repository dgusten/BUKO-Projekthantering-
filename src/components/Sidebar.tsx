"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Alla ärenden", icon: "\u{1F4C1}" },
  { href: "/pagaende", label: "Pågående ärenden", icon: "\u{1F5C2}\u{FE0F}" },
  { href: "/tillstand", label: "Tillstånd", icon: "\u{1F4DC}" },
  { href: "/statistik", label: "Statistik", icon: "\u{1F4CA}" },
];

export default function Sidebar() {
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

      <div className="sidebar-footer">
        <div className="current-user">
          <span className="avatar" style={{ background: "var(--ink-faint)" }}>
            ?
          </span>
          <span>
            <div className="current-user-name">Inloggning ej inkopplad</div>
            <div className="current-user-role">Byggs i nästa steg</div>
          </span>
        </div>
      </div>
    </aside>
  );
}
