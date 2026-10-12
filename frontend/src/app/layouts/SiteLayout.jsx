import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Home, LayoutDashboard, LogIn, Search, User, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar } from '../../components/ui/Card.jsx';
import { NotificationBell } from '../NotificationBell.jsx';
import { getLenis } from '../../lib/lenis.js';
import { cn } from '../../lib/cn.js';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/courses', label: 'Courses', icon: Search },
  { to: '/my-learning', label: 'My learning', icon: BookOpen, auth: true },
  { to: '/certificates', label: 'Certificates', icon: Award, auth: true },
  { to: '/profile', label: 'Profile', icon: User, auth: true },
];

export function Logo({ className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 font-display text-xl font-extrabold text-brand-700', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><GraduationCap className="h-5 w-5" /></span>
      LearnSphere
    </Link>
  );
}

function SearchBox() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); nav(`/courses${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); }} className="relative hidden w-full max-w-sm lg:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input aria-label="Search courses" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100" />
    </form>
  );
}

export function SiteLayout() {
  const { user, status } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const authed = status === 'authed';

  useEffect(() => {
    getLenis()?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  const items = NAV.filter((n) => !n.auth || authed);
  const staff = authed && user.role !== 'student';
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo />
          <SearchBox />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('rounded-xl px-3.5 py-2 text-sm font-semibold transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {authed ? (
              <>
                <NotificationBell />
                {staff ? (
                  <Button to={homeFor(user.role)} size="sm" variant="soft"><LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Workspace</span></Button>
                ) : (
                  <button onClick={() => nav('/profile')} aria-label="Profile" className="ml-1"><Avatar name={user.name} src={user.avatar} size={36} /></button>
                )}
              </>
            ) : (
              <>
                <Button to="/register?teach=1" size="sm" variant="ghost" className="hidden sm:inline-flex">Teach</Button>
                <Button to="/login" size="sm"><LogIn className="h-4 w-4" /> Login</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10"><Outlet /></main>

      <footer className="hidden border-t border-ink-100 bg-white py-8 md:block">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-sm text-ink-500">
          <Logo />
          <nav className="flex gap-5" aria-label="Footer">
            <Link to="/courses" className="hover:text-brand-700">Browse courses</Link>
            <Link to="/register?teach=1" className="hover:text-brand-700">Become an instructor</Link>
            <Link to="/verify" className="hover:text-brand-700">Verify a certificate</Link>
          </nav>
          <p>© {new Date().getFullYear()} LearnSphere</p>
        </div>
      </footer>

      {/* mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden" aria-label="Primary">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-ink-500')}>
                <n.icon className="h-5 w-5" />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
