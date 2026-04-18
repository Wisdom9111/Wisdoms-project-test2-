import React, { useState, useEffect } from 'react';
import { Book, Search, LogOut, Clock, Layout, Info, ExternalLink, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Material, Bulletin } from '../../types';
import { motion } from 'motion/react';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewLevel, setViewLevel] = useState<string>(() => {
    try {
      return sessionStorage.getItem('activeLevel') || user?.level || '100L';
    } catch (e) {
      return user?.level || '100L';
    }
  });

  useEffect(() => {
    if (viewLevel) {
      try {
        sessionStorage.setItem('activeLevel', viewLevel);
      } catch (e) {}
    }
  }, [viewLevel]);

  // Sync viewLevel with user.level if it's the first time it loads and nothing is in session
  useEffect(() => {
    try {
      const savedLevel = sessionStorage.getItem('activeLevel');
      if (!savedLevel && user?.level) {
        setViewLevel(user.level);
      }
    } catch (e) {
      if (user?.level) setViewLevel(user.level);
    }
  }, [user?.level]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Real-time listener for materials matching selected view level
    const materialsRef = collection(db, 'materials');
    const q = query(
      materialsRef, 
      where('level', '==', viewLevel),
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
      handleFirestoreError(error, OperationType.GET, 'materials');
      setLoading(false);
    });

    let unsubscribeBulletins: () => void = () => {};
    try {
      const bulletinsRef = collection(db, 'notices');
      const bulletinsQ = query(
        bulletinsRef,
        where('targetLevel', '==', viewLevel),
        orderBy('createdAt', 'desc')
      );

      unsubscribeBulletins = onSnapshot(bulletinsQ, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Bulletin[];
        setBulletins(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'notices');
      });
    } catch (e) {
      console.error("Broadcast listener error:", e);
    }

    return () => {
      unsubscribe();
      try {
        unsubscribeBulletins();
      } catch (e) {}
    };
  }, [user, viewLevel]);

  useEffect(() => {
    if (!user) return;
    try {
      // Load from sessionStorage if exists, otherwise use user's level
      const sessionLevel = sessionStorage.getItem('activeLevel');
      if (sessionLevel) {
        setViewLevel(sessionLevel);
      } else if (user.level) {
        setViewLevel(user.level);
      }
    } catch (e) {
      if (user.level) setViewLevel(user.level);
    }
  }, [user?.uid, user?.level]);

  const handleLevelChange = (lvl: string) => {
    setViewLevel(lvl);
    try {
      sessionStorage.setItem('activeLevel', lvl);
    } catch (e) {}
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredMaterials = (materials || []).filter(m => 
    (m?.courseCode || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (m?.courseTitle || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  if (!user) {
    return null; // Safety check
  }

  return (
    <>
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
              placeholder="Search by code or title..." 
              className="bg-transparent border-none outline-none text-sm placeholder:text-white/50 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mt-2 tracking-tight">Welcome, {user?.name || 'Student'}</h1>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Clock className="text-mouau-green" size={18} />
              </div>
              <select
                value={viewLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="bg-white pl-12 pr-10 py-3 rounded-[4px] border border-gray-100 shadow-sm text-sm font-bold text-[#666666] uppercase tracking-wide cursor-pointer hover:border-mouau-green transition-all appearance-none outline-none focus:border-mouau-green focus:ring-1 focus:ring-mouau-green"
              >
                {['100L', '200L', '300L', '400L'].map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl} Section</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-400"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Learning Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">Course Materials ({viewLevel || '100L'})</h2>
            <div className="flex items-center gap-2 text-mouau-green text-sm font-bold uppercase tracking-widest">
              <Layout size={16} />
              <span>{materials?.length || 0} Materials</span>
            </div>
          </div>

          {loading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-[4px]" />
               ))}
             </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900">No courses matching your criteria</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                We couldn't find any materials for {viewLevel} matching "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMaterials.map((material) => (
                <div key={material.id} className="bg-white rounded-[4px] border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row items-center justify-between p-6 hover:border-mouau-green transition-all gap-4">
                  <div className="flex-1 w-full text-left">
                     <div className="flex items-center gap-4 mb-2">
                       <span className="font-bold text-mouau-green tracking-tight font-mono bg-mouau-green/5 px-3 py-1 rounded">{material.courseCode}</span>
                       <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{material.semester} Semester</span>
                     </div>
                     <h3 className="font-serif font-bold text-xl text-gray-900">{material.courseTitle}</h3>
                     <p className="text-sm text-gray-500 mt-1">Uploaded by: {material.lecturerName}</p>
                  </div>
                  <button
                     onClick={() => navigate(`/course/${material.id}`)}
                     className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-mouau-green text-white px-6 py-3 rounded-[4px] font-bold text-xs uppercase tracking-widest hover:bg-[#00522b] transition-all shadow-md"
                  >
                     <ExternalLink size={16} />
                     Read Document
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Latest Announcements */}
        <section className="bg-gray-50 rounded-[4px] p-10 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif font-bold text-[#1a1a1a] flex items-center gap-3">
              <Bell className="text-mouau-gold" size={24} />
              Internal Bulletins
            </h2>
            <span className="text-[10px] bg-mouau-gold/20 text-mouau-gold px-3 py-1 rounded-full font-bold uppercase tracking-widest">{bulletins.length} Active Notice{bulletins.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-6">
            {bulletins.length === 0 ? (
              <div className="text-center py-10 text-gray-400 italic font-serif">
                No active notices for the current session.
              </div>
            ) : (
              bulletins.map((bulletin) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={bulletin.id} 
                  className="flex gap-6 p-6 rounded-[4px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-mouau-green group-hover:w-2 transition-all" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif font-bold text-[#1a1a1a] text-lg">Broadcast from {bulletin.lecturerName}</h4>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{bulletin.createdAt?.toDate ? new Date(bulletin.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
                    </div>
                    <p className="text-sm text-[#666666] leading-relaxed font-medium">{bulletin.content}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
    </>
  );
};

export default StudentDashboard;
