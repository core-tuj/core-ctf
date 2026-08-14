'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';

import { LogoLockup } from '@/components/layout/logo';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Buka navigasi</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left">
        <SheetTitle asChild>
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <LogoLockup size={28} textClassName="text-base" />
          </Link>
        </SheetTitle>

        {/* layoutGroup dibedakan dari sidebar desktop supaya animasi pill
            kedua nav tidak saling tarik-menarik saat keduanya ter-mount. */}
        <SidebarNav
          isAdmin={isAdmin}
          layoutGroup="mobile"
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
