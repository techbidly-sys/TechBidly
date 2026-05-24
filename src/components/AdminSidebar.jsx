'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Tag, PackageCheck, Gavel, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';
import { Logo } from './Sidebar.jsx';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/listings', label: 'Listings', icon: Tag },
  { to: '/admin/bids', label: 'Active Bids', icon: Gavel },
  { to: '/admin/orders', label: 'Orders', icon: PackageCheck },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col border-r"
      style={{
        background: 'linear-gradient(160deg, #13103a 0%, #0e0b2e 60%, #12082a 100%)',
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <div className="px-6 pt-6 pb-4">
        <Logo />
        <div
          className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: 'rgba(180,165,255,0.55)' }}
        >
          Admin Console
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {ADMIN_LINKS.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link key={to} href={to} className={`nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6 space-y-1">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(139,98,255,0.12)', color: 'rgba(200,185,255,0.75)' }}
        >
          <Shield size={13} />
          <span className="text-xs font-semibold">Admin Account</span>
        </div>
        <button
          onClick={handleSignOut}
          className="nav-link w-full text-left"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
