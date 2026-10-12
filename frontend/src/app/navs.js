import { LayoutDashboard, BookOpen, Users, Tags, Ticket, Settings, MailCheck, Bell, ClipboardCheck, CreditCard, MessageSquare, UserCircle, GraduationCap } from 'lucide-react';

export const INSTRUCTOR_NAV = [
  { to: '/instructor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/instructor/courses', label: 'My courses', icon: BookOpen },
  { to: '/instructor/qa', label: 'Student Q&A', icon: MessageSquare },
  { to: '/instructor/coupons', label: 'Coupons', icon: Ticket },
  { to: '/instructor/profile', label: 'Profile', icon: UserCircle },
  { to: '/instructor/notifications', label: 'Notifications', icon: Bell },
];
export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses & review', icon: ClipboardCheck },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/enrollments', label: 'Enrolments', icon: GraduationCap },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/logs', label: 'Email log', icon: MailCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
];
