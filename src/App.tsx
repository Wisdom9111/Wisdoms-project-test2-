import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShieldCheck } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

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
  <div className="fixed inset-0 z-[1000] bg-[#f8fafc] dark:bg-gray-900 flex flex-col items-center justify-center transition-colors">
    <div className="animate-spin text-[#006837] mb-4">
      <ShieldCheck size={64} />
    </div>
    <p className="text-[#006837] font-serif font-bold text-xl animate-pulse">MOUAU Portal Loading...</p>
    <p className="text-gray-400 text-sm mt-2">Establishing secure connection</p>
  </div>
);

// Global Theme Engine synced strictly with Admin settings
const ThemeEngine = () => {
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
    return () => unsub();
  }, []);
  return null;
};

// Suspended Screen Overlay Component
const SuspendedScreen = () => (
  <div className="fixed inset-0 z-[9999] bg-white/90 dark:bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center transition-colors">
    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
      <ShieldCheck size={48} className="animate-pulse" />
    </div>
    <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">Account Suspended</h1>
    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">
      Your portal access has been temporarily suspended by the system administrator. 
      You are logged in, but your functions have been locked. Please contact support to appeal.
    </p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole, allowedRoles }: { children: React.ReactNode, allowedRole?: 'student' | 'lecturer' | 'admin', allowedRoles?: ('student'|'lecturer'|'admin')[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  
  const isSuspended = user.is_suspended && user.role !== 'admin';
  
  const roles = allowedRoles || (allowedRole ? [allowedRole] : undefined);

  if (roles && !roles.includes(user.role)) {
    // Admin Master Override: Admins can go anywhere except they shouldn't just accidentally land on student dash
    if (user.role === 'admin' && roles.includes('student')) {
        // let them through
    } else {
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
        return <Navigate to={user.role === 'lecturer' ? '/lecturer-dashboard' : '/student-dashboard'} replace />;
    }
  }
  
  return (
    <>
      {isSuspended && <SuspendedScreen />}
      {/* If suspended, visually block children using pointer-events-none and absolute overlay */}
      <div className={isSuspended ? 'pointer-events-none filter blur-sm opacity-50 h-screen overflow-hidden' : ''}>
        {children}
      </div>
    </>
  );
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
      <ThemeEngine />
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
          <ProtectedRoute allowedRoles={['student', 'admin', 'lecturer']}>
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
