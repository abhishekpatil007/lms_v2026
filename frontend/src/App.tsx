import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AdminLayout } from './layouts/AdminLayout';
import { InstructorLayout } from './layouts/InstructorLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersPage } from './pages/admin/UsersPage';
import { BatchesPage } from './pages/admin/BatchesPage';
import { VideosPage } from './pages/admin/VideosPage';
import { DocumentsPage } from './pages/admin/DocumentsPage';
import { LiveClassesPage } from './pages/admin/LiveClassesPage';
import { CoursesPage } from './pages/admin/CoursesPage';
import { InvoicesPage } from './pages/admin/InvoicesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { InstructorDashboard } from './pages/instructor/InstructorDashboard';
import { BatchDetailPage } from './pages/instructor/BatchDetailPage';
import { InstructorSettingsPage } from './pages/instructor/InstructorSettingsPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentDocumentsPage } from './pages/student/StudentDocumentsPage';
import { StudentVideosPage } from './pages/student/StudentVideosPage';
import { StudentSettingsPage } from './pages/student/StudentSettingsPage';
import { WebinarLanding } from './pages/public/WebinarLanding';
import { WebinarJoin } from './pages/public/WebinarJoin';
import { WebinarsPage } from './pages/admin/WebinarsPage';
import { TestsPage } from './pages/admin/TestsPage';
import { TestBuilderPage } from './pages/admin/TestBuilderPage';
import { InstructorWebinarsPage } from './pages/instructor/InstructorWebinarsPage';
import { InstructorTestsPage } from './pages/instructor/InstructorTestsPage';
import { InstructorEvaluationsPage } from './pages/instructor/InstructorEvaluationsPage';
import { EvaluationGradingPage } from './pages/instructor/EvaluationGradingPage';
import { StudentTestsPage } from './pages/student/StudentTestsPage';
import { TestTakingPage } from './pages/student/TestTakingPage';
import { TestResultPage } from './pages/student/TestResultPage';

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public Webinar Routes */}
        <Route path="/webinar/:id" element={<WebinarLanding />} />
        <Route path="/webinar/:id/join" element={<WebinarJoin />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="live-classes" element={<LiveClassesPage />} />
          <Route path="webinars" element={<WebinarsPage />} />
          <Route path="tests" element={<TestsPage />} />
          <Route path="tests/:testId/builder" element={<TestBuilderPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route
          path="/instructor"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="batches" element={<InstructorDashboard />} />
          <Route path="batches/:batchId" element={<BatchDetailPage />} />
          <Route path="webinars" element={<InstructorWebinarsPage />} />
          <Route path="tests" element={<InstructorTestsPage />} />
          <Route path="tests/:testId/builder" element={<TestBuilderPage />} />
          <Route path="evaluations" element={<InstructorEvaluationsPage />} />
          <Route path="evaluations/:attemptId" element={<EvaluationGradingPage />} />
          <Route path="settings" element={<InstructorSettingsPage />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="documents" element={<StudentDocumentsPage />} />
          <Route path="videos" element={<StudentVideosPage />} />
          <Route path="tests" element={<StudentTestsPage />} />
          <Route path="tests/:testId/take" element={<TestTakingPage />} />
          <Route path="tests/:attemptId/result" element={<TestResultPage />} />
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
