'use client';

import { LogOut, ShieldHalf, Users } from 'lucide-react';

import { signOut } from '@/lib/actions/auth';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export function UserMenu({
  name,
  email,
  avatarUrl,
  role,
  teamName,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'admin' | 'player';
  teamName: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Menu akun</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate">{name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="opacity-100">
          <Users />
          <span className="truncate text-muted-foreground">
            {teamName ?? 'Mode individu'}
          </span>
        </DropdownMenuItem>

        {role === 'admin' ? (
          <DropdownMenuItem disabled className="opacity-100">
            <ShieldHalf />
            <span className="text-muted-foreground">Role: admin</span>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <form action={signOut}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut />
              Keluar
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
