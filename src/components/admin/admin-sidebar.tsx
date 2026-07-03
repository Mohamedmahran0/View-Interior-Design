'use client';

import { Link, usePathname } from '@/i18n/routing';
import { LayoutDashboard, Users, CreditCard, ArrowLeftRight, FolderKanban, Box, Settings, LogOut, Shield } from 'lucide-react';
import { useSupabase } from '@/providers/supabase-provider';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { href: '/admin/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/admin/assets', icon: Box, label: 'Assets' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { supabase } = useSupabase();
  const router = useRouter();
  const t = useTranslations();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 bg-neutral-950/95 backdrop-blur-xl border-r border-white/5 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
          V
        </div>
        <div>
          <span className="font-mono tracking-widest font-bold uppercase text-sm">Admin</span>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium uppercase tracking-wider">
            <Shield size={10} />
            Panel
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {t(item.label) || item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
