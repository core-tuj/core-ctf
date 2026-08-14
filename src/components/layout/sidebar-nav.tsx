'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

import { ADMIN_NAV, MAIN_NAV, isNavItemActive, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

function NavLink({
  item,
  active,
  layoutGroup,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  layoutGroup: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
      )}
    >
      {active ? (
        // layoutId membuat pill-nya menggeser mulus antar item saat pindah route
        <motion.span
          layoutId={`${layoutGroup}-active`}
          className="absolute inset-0 rounded-md border border-primary/30 bg-primary/10"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      ) : null}
      <Icon className="relative h-4 w-4 shrink-0" />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

export function SidebarNav({
  isAdmin,
  layoutGroup = 'sidebar',
  onNavigate,
}: {
  isAdmin: boolean;
  layoutGroup?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
      {MAIN_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isNavItemActive(pathname, item.href)}
          layoutGroup={layoutGroup}
          onNavigate={onNavigate}
        />
      ))}

      {isAdmin ? (
        <>
          <p className="px-3 pb-1 pt-5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/70">
            Admin
          </p>
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              layoutGroup={layoutGroup}
              onNavigate={onNavigate}
            />
          ))}
        </>
      ) : null}
    </nav>
  );
}
