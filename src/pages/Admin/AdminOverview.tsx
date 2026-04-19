import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Activity, Users, BookOpen, GraduationCap, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalLecturers: 0,
    activeLecturers: 0,
    pendingLecturers: 0,
    totalMaterials: 0,
    totalOnline: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will use onSnapshot to provide real-time updates for the Overview!
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      let studentCounts = 0;
      let lecturerCounts = 0;
      let activeLecturerCounts = 0;
      let pendingLecturerCounts = 0;
      let onlineCounts = 0;
      
      const now = Date.now();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.role === 'student') studentCounts++;
        if (data.role === 'lecturer') {
          lecturerCounts++;
          if (data.is_approved) activeLecturerCounts++;
          else pendingLecturerCounts++;
        }

        // Online check (within 2 minutes = 120000ms)
        if (data.last_active && data.last_active.toMillis) {
          const lastActiveTime = data.last_active.toMillis();
          if (now - lastActiveTime <= 120000 && !data.is_suspended) {
            onlineCounts++;
          }
        }
      });

      setStats(prev => ({
        ...prev,
        totalStudents: studentCounts,
        totalLecturers: lecturerCounts,
        activeLecturers: activeLecturerCounts,
        pendingLecturers: pendingLecturerCounts,
        totalOnline: onlineCounts
      }));
      setLoading(false);
    });

    const matUnsub = onSnapshot(collection(db, 'materials'), (snapshot) => {
      setStats(prev => ({
        ...prev,
        totalMaterials: snapshot.docs.length
      }));
    });

    return () => {
      usersUnsub();
      matUnsub();
    };
  }, []);

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4"
    >
      <div className={`p-4 rounded-xl ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">{subtitle}</p>}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">System Overview</h2>
        <p className="text-gray-500 dark:text-gray-400">Real-time holistic view of the portal.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="Total Students" 
            value={stats.totalStudents} 
            icon={GraduationCap} 
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
          />
          <StatCard 
            title="Total Lecturers" 
            value={stats.totalLecturers} 
            icon={Users} 
            colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            subtitle={`${stats.activeLecturers} Approved • ${stats.pendingLecturers} Pending`}
          />
          <StatCard 
            title="Total PDFs/Materials" 
            value={stats.totalMaterials} 
            icon={BookOpen} 
            colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" 
          />
          <StatCard 
            title="Active Now" 
            value={stats.totalOnline} 
            icon={Activity} 
            colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
            subtitle="Users online in the last 2 minutes"
          />
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
