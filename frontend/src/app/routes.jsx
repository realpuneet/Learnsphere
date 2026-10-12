import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards.jsx';
import { SiteLayout } from './layouts/SiteLayout.jsx';
import { StaffLayout } from './layouts/StaffLayout.jsx';
import { ADMIN_NAV, INSTRUCTOR_NAV } from './navs.js';
import { PageLoader } from '../components/ui/Feedback.jsx';

const L = (loader) => lazy(loader);
// public
const Home = L(() => import('../pages/public/Home.jsx'));
const Courses = L(() => import('../pages/public/Courses.jsx'));
const CourseDetail = L(() => import('../pages/public/CourseDetail.jsx'));
const InstructorProfile = L(() => import('../pages/public/InstructorProfile.jsx'));
const VerifyCertificate = L(() => import('../pages/public/VerifyCertificate.jsx'));
const Login = L(() => import('../pages/public/Login.jsx'));
const Register = L(() => import('../pages/public/Register.jsx'));
const ForgotPassword = L(() => import('../pages/public/ForgotPassword.jsx'));
const ResetPassword = L(() => import('../pages/public/ResetPassword.jsx'));
const AuthCallback = L(() => import('../pages/public/AuthCallback.jsx'));
const NotFound = L(() => import('../pages/public/NotFound.jsx'));
// student
const MyLearning = L(() => import('../pages/student/MyLearning.jsx'));
const Learn = L(() => import('../pages/student/Learn.jsx'));
const Certificates = L(() => import('../pages/student/Certificates.jsx'));
const CertificateView = L(() => import('../pages/student/CertificateView.jsx'));
// shared
const Profile = L(() => import('../pages/shared/Profile.jsx'));
const Notifications = L(() => import('../pages/shared/Notifications.jsx'));
const Coupons = L(() => import('../pages/shared/Coupons.jsx'));
// instructor
const InstructorDashboard = L(() => import('../pages/instructor/Dashboard.jsx'));
const InstructorCourses = L(() => import('../pages/instructor/Courses.jsx'));
const CourseEditor = L(() => import('../pages/instructor/CourseEditor.jsx'));
const CourseStudents = L(() => import('../pages/instructor/Students.jsx'));
const InstructorQA = L(() => import('../pages/instructor/QA.jsx'));
// admin
const AdminDashboard = L(() => import('../pages/admin/Dashboard.jsx'));
const AdminCourses = L(() => import('../pages/admin/Courses.jsx'));
const AdminUsers = L(() => import('../pages/admin/Users.jsx'));
const AdminCategories = L(() => import('../pages/admin/Categories.jsx'));
const AdminEnrollments = L(() => import('../pages/admin/Enrollments.jsx'));
const AdminPayments = L(() => import('../pages/admin/Payments.jsx'));
const AdminLogs = L(() => import('../pages/admin/Logs.jsx'));
const AdminSettings = L(() => import('../pages/admin/Settings.jsx'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* instructor workspace (admins may also use it for their own drafts) */}
        <Route element={<RequireRole roles={['instructor', 'admin']} />}>
          <Route element={<StaffLayout nav={INSTRUCTOR_NAV} title="Instructor studio" />}>
            <Route path="/instructor" element={<InstructorDashboard />} />
            <Route path="/instructor/courses" element={<InstructorCourses />} />
            <Route path="/instructor/courses/:id" element={<CourseEditor />} />
            <Route path="/instructor/courses/:id/students" element={<CourseStudents />} />
            <Route path="/instructor/qa" element={<InstructorQA />} />
            <Route path="/instructor/coupons" element={<Coupons scope="instructor" />} />
            <Route path="/instructor/profile" element={<Profile />} />
            <Route path="/instructor/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route element={<StaffLayout nav={ADMIN_NAV} title="Admin console" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/enrollments" element={<AdminEnrollments />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/coupons" element={<Coupons scope="admin" />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/instructors/:id" element={<InstructorProfile />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/verify/:code" element={<VerifyCertificate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<RequireAuth />}>
            <Route path="/learn/:courseId/:lessonId?" element={<Learn />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>
          <Route element={<RequireRole roles={['student']} />}>
            <Route path="/my-learning" element={<MyLearning />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/certificates/:id" element={<CertificateView />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
