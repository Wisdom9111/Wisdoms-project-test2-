import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, UserPlus, 
  CheckCircle, Search, LogOut, Moon, Sun, ShieldCheck, Megaphone 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import AdminOverview from './AdminOverview';
import AdminStudents from './AdminStudents';
import AdminLecturers from './AdminLecturers';
import AdminMaterials from './AdminMaterials';
import AdminApprovals from './AdminApprovals';
import AdminAddUser from './AdminAddUser';
import AdminBroadcasts from './AdminBroadcasts';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().theme === 'dark') {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(false);
      }
    });
    return () => unsub();
  }, []);

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    try {
      await setDoc(doc(db, 'settings', 'global'), { theme: newTheme }, { merge: true });
    } catch(err) {
      console.error("Failed to toggle global theme.", err);
    }
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === `/admin-dashboard${to}` || (to === '' && location.pathname === '/admin-dashboard');
    return (
      <Link
        to={`/admin-dashboard${to}`}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
          isActive 
            ? 'bg-mouau-green text-white shadow-md' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-mouau-green dark:hover:text-green-400'
        }`}
      >
        <Icon size={20} />
        {label}
      </Link>
    );
  };

  return (
    <div className={`min-h-screen flex bg-gray-50 dark:bg-gray-900`}>
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed h-full z-10 transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-mouau-green dark:text-green-500 mb-2">
            <ShieldCheck size={28} />
            <h1 className="font-serif font-bold text-xl">MOUAU Admin</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Master Control Vault</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <NavItem to="" icon={LayoutDashboard} label="Overview" />
          <NavItem to="/students" icon={Users} label="Student Users" />
          <NavItem to="/lecturers" icon={Users} label="Lecturer Users" />
          <NavItem to="/approvals" icon={CheckCircle} label="Lecturer Approvals" />
          <NavItem to="/add-user" icon={UserPlus} label="Add User Manually" />
          <NavItem to="/materials" icon={BookOpen} label="All Materials" />
          <NavItem to="/broadcasts" icon={Megaphone} label="Broadcasts" />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Switch Global Theme for ALL Users"
          >
            <span className="flex items-center gap-3 font-medium">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              {isDarkMode ? 'Global Light' : 'Global Dark'}
            </span>
          </button>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            Logout Securely
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 p-8 overflow-x-hidden min-h-screen transition-colors text-gray-900 dark:text-gray-100">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/students" element={<AdminStudents />} />
          <Route path="/lecturers" element={<AdminLecturers />} />
          <Route path="/approvals" element={<AdminApprovals />} />
          <Route path="/add-user" element={<AdminAddUser />} />
          <Route path="/materials" element={<AdminMaterials />} />
          <Route path="/broadcasts" element={<AdminBroadcasts />} />
          <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;
