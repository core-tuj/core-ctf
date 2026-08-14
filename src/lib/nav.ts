import {
  Flag,
  LayoutDashboard,
  ShieldHalf,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya tampil untuk role admin. */
  adminOnly?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/challenges', label: 'Challenges', icon: Flag },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/teams', label: 'Tim', icon: Users },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Panel Admin', icon: ShieldHalf, adminOnly: true },
];

/** Route dianggap aktif untuk dirinya sendiri dan semua turunannya. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
