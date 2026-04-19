import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShieldCheck } from 'lucide-react';

// Lazy loading all routes for performance (Micro-Modularization)
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));

const LecturerDashboard = lazy(() => import('./pages/Lecturer/LecturerDashboard'));
const UploadMaterial = lazy(() => import('./pages/Lecturer/UploadMaterial'));

const StudentDashboard = lazy(() => import('./pages/Student/StudentDashboard'));
const SecureViewer = lazy(() => import('./pages/Student/SecureViewer'));
const Quiz = lazy(() => import('./pages/Student/Quiz'));
const ResearchAssistant = lazy(() => import('./pages/Student/ResearchAssistant'));

const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));

// Loading component (Global Loader)
const LoadingScreen = () => (
  <div className="fixed inset-0 z-[1000] bg-[#f8fafc] flex flex-col items-center justify-center">
    <div className="animate-spin text-[#006837] mb-4">
      <ShieldCheck size={64} />
    </div>
    <p className="text-[#006837] font-serif font-bold text-xl animate-pulse">MOUAU Portal Loading...</p>
    <p className="text-gray-400 text-sm mt-2">Establishing secure connection</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'student' | 'lecturer' | 'admin' }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to={user.role === 'lecturer' ? '/lecturer-dashboard' : '/student-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

// Auth Guard for Public Routes (prevents stuck on login page)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to={user.role === 'lecturer' ? '/lecturer-dashboard' : '/student-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin-dashboard/*" element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Lecturer Routes */}
        <Route path="/lecturer-dashboard" element={
          <ProtectedRoute allowedRole="lecturer">
            <LecturerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute allowedRole="lecturer">
            <UploadMaterial />
          </ProtectedRoute>
        } />

        {/* Student Routes */}
        <Route path="/student-dashboard" element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/course/:id" element={
          <ProtectedRoute allowedRole="student">
            <SecureViewer />
          </ProtectedRoute>
        } />
        <Route path="/quiz/:id" element={
          <ProtectedRoute allowedRole="student">
            <Quiz />
          </ProtectedRoute>
        } />
        <Route path="/research-assistant" element={
          <ProtectedRoute allowedRole="student">
            <ResearchAssistant />
          </ProtectedRoute>
        } />

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
