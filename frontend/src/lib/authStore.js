import { create } from 'zustand';

/** Access token lives in memory only (XSS-safe); the refresh token is an httpOnly cookie. */
export const useAuth = create((set, get) => ({
  user: null,
  accessToken: null,
  status: 'loading', // loading | authed | guest
  setSession: ({ user, accessToken }) => set({ user, accessToken, status: 'authed' }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: 'guest' }),
  hasRole: (...roles) => roles.includes(get().user?.role),
}));

export const homeFor = (role) => ({ student: '/my-learning', instructor: '/instructor', admin: '/admin' })[role] || '/';
