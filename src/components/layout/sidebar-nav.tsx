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
        'relative flex items-center gap-2.5 py-1.5 pl-3 pr-2 text-[0.8125rem] transition-colors',
        active
          ? 'font-medium text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {active ? (
        // Penanda garis tepi, bukan pill: satu elemen tipis sudah menunjukkan
        // posisi tanpa menambah bidang baru di sidebar.
        <motion.span
          layoutId={`${layoutGroup}-active`}
          className="absolute inset-y-0 left-0 w-0.5 bg-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      ) : null}
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{item.label}</span>
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
    <nav className="flex flex-col gap-0.5" aria-label="Navigasi utama">
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
          <p className="label-micro px-3 pb-1.5 pt-5 text-muted-foreground/60">
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
