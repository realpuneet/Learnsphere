import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, LogOut, GraduationCap } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Avatar } from '../../components/ui/Card.jsx';
import { Drawer } from '../../components/ui/Overlay.jsx';
import { NotificationBell } from '../NotificationBell.jsx';
import { cn } from '../../lib/cn.js';
import { disconnectSocket } from '../../lib/socket.js';
import { useQueryClient } from '@tanstack/react-query';

export function StaffLayout({ nav, title }) {
  const [open, setOpen] = useState(false);
  const { user, clear } = useAuth();
  const go = useNavigate();
  const qc = useQueryClient();

  const logout = async () => {
    await post('/auth/logout').catch(() => {});
    disconnectSocket();
    clear();
    qc.clear();
    go('/login');
  };

  const links = (
    <nav className="flex flex-col gap-1 p-3" aria-label={title}>
      {nav.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100')}>
          <n.icon className="h-[18px] w-[18px]" /> {n.label}
        </NavLink>
      ))}
    </nav>
  );
  const brand = (
    <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-extrabold text-brand-700">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><GraduationCap className="h-5 w-5" /></span>
      <div className="leading-tight">LearnSphere<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</div></div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink-100 bg-white lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">{links}</div>
        <button onClick={logout} className="m-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100"><LogOut className="h-[18px] w-[18px]" /> Logout</button>
      </aside>

      <Drawer open={open} onClose={() => setOpen(false)}>
        {brand}
        {links}
        <button onClick={logout} className="m-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100"><LogOut className="h-[18px] w-[18px]" /> Logout</button>
      </Drawer>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/85 px-4 backdrop-blur-lg sm:px-6">
          <button className="rounded-xl p-2 text-ink-700 hover:bg-ink-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm font-semibold text-ink-500 lg:block">{title}</div>
          <div className="flex items-center gap-2">
            <NotificationBell to={`/${user.role}/notifications`} />
            <div className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-3">
              <Avatar name={user.name} src={user.avatar} size={34} />
              <span className="hidden text-sm font-semibold text-ink-800 sm:block">{user.name}</span>
            </div>
          </div>
        </header>
        <main className="p-4 pb-16 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
