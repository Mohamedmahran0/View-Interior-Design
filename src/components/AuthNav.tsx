'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { Link } from '@/i18n/routing';
import { LayoutDashboard } from 'lucide-react';

export default function AuthNav() {
  const { user, loading } = useSupabase();

  if (loading) {
    return (
      <div className="w-24 h-9 bg-white/5 border border-white/10 rounded-full animate-pulse"></div>
    );
  }

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 transition font-semibold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]"
      >
        <LayoutDashboard size={16} />
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="hover:text-emerald-400 transition hidden sm:block">
        Sign In
      </Link>
      <Link
        href="/signup"
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 transition font-semibold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
      >
        Sign Up
      </Link>
    </>
  );
}