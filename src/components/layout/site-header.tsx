import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { MobileNav } from '@/components/layout/mobile-nav';
import { UserMenu } from '@/components/layout/user-menu';
import type { Profile } from '@/types/database';

export function SiteHeader({
  profile,
  email,
  teamName,
}: {
  profile: Profile;
  email: string;
  teamName: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <MobileNav isAdmin={profile.role === 'admin'} />

        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-mono text-base font-bold tracking-tight">
            CORE <span className="text-destructive">CTF</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="label-micro">skor</span>
            <span className="tabular font-mono text-sm font-semibold text-primary">
              {profile.total_score}
            </span>
          </div>

          <UserMenu
            name={profile.name}
            email={email}
            avatarUrl={profile.avatar_url}
            role={profile.role}
            teamName={teamName}
          />
        </div>
      </div>
    </header>
  );
}
