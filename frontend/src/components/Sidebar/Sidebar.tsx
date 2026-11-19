import type { FC } from "react";
import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

type Icon = FC<{ className?: string }>;

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
}

interface SidebarProps {
  items: NavItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav} aria-label="Navegação principal">
        <ul className={styles.list}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end
                  className={({ isActive }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                  }
                >
                  <Icon className={styles.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export { Sidebar };
