import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, LogOut, LayoutDashboard, ChevronRight, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Material } from '../../types';

const LecturerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recentUploads, setRecentUploads] = useState<Material[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const materialsRef = collection(db, 'materials');
    const q = query(
      materialsRef, 
      where('lecturerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      setRecentUploads(data.slice(0, 5));
      setTotalMaterials(data.length);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const stats = [
    { label: 'Total Materials', value: totalMaterials.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Topics', value: Array.from(new Set(recentUploads.map(m => m.courseCode))).length.toString(), icon: LayoutDashboard, color: 'bg-green-50 text-[#006837]' },
    { label: 'Portal Status', value: 'Active', icon: ChevronRight, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#006837] p-2 rounded-lg text-white">
            <LayoutDashboard size={20} />
          </div>
          <span className="text-xl font-bold text-[#006837]">MOUAU Lecturer Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2 hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">MOUAU Academic Staff</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-mouau-green tracking-tight">Welcome, {user?.name}</h1>
            <p className="text-gray-500 mt-2 font-medium">Manage your courseware and student resources.</p>
          </div>
          <button 
            onClick={() => navigate('/upload')}
            className="flex items-center justify-center gap-2 bg-mouau-green text-white px-8 py-3 rounded-[4px] hover:bg-[#00522b] transition-all shadow-lg shadow-mouau-green/20 font-semibold"
          >
            <Upload size={18} />
            <span>Upload Material</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-8 rounded-[4px] shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-mouau-green/30 transition-colors">
              <div className={`${stat.color} p-4 rounded-full group-hover:scale-110 transition-transform`}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#666666] uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-serif font-bold text-[#1a1a1a] mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[4px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-serif font-bold text-xl text-[#1a1a1a]">Your Recent Uploads</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading your materials...</div>
            ) : recentUploads.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>You haven't uploaded any materials yet.</p>
              </div>
            ) : (
              recentUploads.map((material) => (
                <div key={material.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-mouau-green/10 text-mouau-green rounded-[4px] flex items-center justify-center font-bold text-xs border border-mouau-green/20 group-hover:bg-mouau-green group-hover:text-white transition-colors uppercase">
                      PDF
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#1a1a1a] group-hover:text-mouau-green transition-colors">{material.courseCode} - {material.courseTitle}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Target: {material.level} • {material.semester} Semester</p>
                    </div>
                  </div>
                  <a href={material.fileUrl} target="_blank" rel="noreferrer" className="text-gray-300 group-hover:text-mouau-green transition-colors">
                    <ChevronRight size={20} />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LecturerDashboard;
