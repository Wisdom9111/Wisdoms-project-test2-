import React, { useState, useEffect } from 'react';
import { Book, Search, LogOut, Clock, PlayCircle, Star, FileText, Layout, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Material } from '../../types';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for materials matching student level
    const materialsRef = collection(db, 'materials');
    const q = query(
      materialsRef, 
      where('level', '==', user.level || '300L'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      setMaterials(data);
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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-[#006837] text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Book size={24} />
          <span className="text-xl font-bold tracking-tight">MOUAU Courseware</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
            <Search size={16} className="text-white/70 mr-2" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              className="bg-transparent border-none outline-none text-sm placeholder:text-white/50 w-48"
            />
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-[2px] text-mouau-green">Student Portal</span>
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mt-2 tracking-tight">Welcome, {user?.name}</h1>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-5 py-3 rounded-[4px] border border-gray-100 shadow-sm flex items-center gap-3">
              <Star className="text-mouau-gold fill-mouau-gold" size={18} />
              <span className="font-bold text-[#1a1a1a]">4.2 GPA</span>
            </div>
            <div className="bg-white px-5 py-3 rounded-[4px] border border-gray-100 shadow-sm flex items-center gap-3">
              <Clock className="text-mouau-green" size={18} />
              <span className="text-sm font-bold text-[#666666] uppercase tracking-wide">{user?.level} Section</span>
            </div>
          </div>
        </div>

        {/* Dynamic Learning Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">Curated learning for {user?.level}</h2>
            <div className="flex items-center gap-2 text-mouau-green text-sm font-bold uppercase tracking-widest">
              <Layout size={16} />
              <span>{materials.length} Materials</span>
            </div>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[1,2,3].map(i => (
                 <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-[4px]" />
               ))}
             </div>
          ) : materials.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900">No courses uploaded yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                No courses have been uploaded for your level ({user?.level}) yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {materials.map((material) => (
                <button 
                  key={material.id}
                  onClick={() => navigate(`/course/${material.id}`)}
                  className="bg-white p-8 rounded-[4px] shadow-sm border border-gray-100 hover:shadow-xl hover:border-mouau-green/20 transition-all cursor-pointer group flex flex-col h-full text-left w-full"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-gray-50 rounded-full group-hover:bg-mouau-green/10 transition-colors text-mouau-green">
                      <FileText size={28} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px]">{material.semester} Semester</span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#1a1a1a] mb-2 group-hover:text-mouau-green transition-colors leading-snug">
                    {material.courseCode}: {material.courseTitle}
                  </h3>
                  <p className="text-sm italic font-serif text-gray-500 mt-auto pt-8">
                    Lecturer: {material.lecturerName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Latest Announcements */}
        <section className="bg-gray-50 rounded-[4px] p-10 border border-gray-100">
          <h2 className="text-xl font-serif font-bold text-[#1a1a1a] mb-6">Internal Bulletins</h2>
          <div className="space-y-6">
            <div className="flex gap-6 p-6 rounded-[4px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-mouau-green w-1.5 rounded-full shrink-0" />
              <div>
                <h4 className="font-serif font-bold text-[#1a1a1a] text-lg">CSC 301 Midterm Postponed</h4>
                <p className="text-sm text-[#666666] mt-2 leading-relaxed">Due to the state-wide public holiday, the algorithms exam has been rescheduled to next Friday. Please adjust your study calendar accordingly.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
