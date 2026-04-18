import React, { useState, useEffect } from 'react';
import { Book, Search, LogOut, Clock, Layout, Info, ExternalLink, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Material, Bulletin } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

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

  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);

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
  
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Real-time listener for ALL materials (so search works globally)
    const materialsRef = collection(db, 'materials');
    const q = query(materialsRef, orderBy('createdAt', 'desc'));

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

  // Filter materials based on search term OR selected view level
  const displayMaterials = (materials || []).filter(m => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return (
        (m.courseCode || '').toLowerCase().includes(term) ||
        (m.courseTitle || '').toLowerCase().includes(term)
      );
    }
    // If no search term, only show the selected level
    return m.level === viewLevel;
  });

  if (!user) {
    return null; // Safety check
  }

  return (
    <>
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-[#006837] text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book size={24} />
              <span className="text-xl font-bold tracking-tight">MOUAU Courseware</span>
            </div>
            {/* Mobile Logout */}
            <button 
              onClick={handleLogout}
              className="md:hidden flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors border border-white/20"
            >
              <LogOut size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
            </button>
          </div>
          <div className="flex flex-1 md:flex-none items-center gap-4">
            <div className="flex flex-1 items-center bg-white/10 px-4 py-2.5 rounded-lg border border-white/20 shadow-inner focus-within:ring-2 focus-within:ring-mouau-gold/50 transition-all">
              <Search size={18} className="text-white/70 mr-3" />
              <input 
                type="text" 
                placeholder="Search course code or title..." 
                className="bg-transparent border-none outline-none text-sm placeholder:text-white/60 w-full md:w-72 text-white font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Desktop Logout */}
            <button 
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 hover:bg-white/10 px-4 py-2.5 rounded-lg transition-colors border border-transparent hover:border-white/20"
            >
              <LogOut size={18} />
              <span className="font-bold text-sm">Logout</span>
            </button>
          </div>
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
              <button 
                onClick={() => setIsLevelOpen(!isLevelOpen)}
                className="bg-white px-6 py-3 rounded-[4px] border border-gray-200 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-mouau-green hover:shadow-md transition-all min-w-[200px]"
              >
                <div className="flex items-center gap-3">
                  <Clock className="text-mouau-green" size={18} />
                  <span className="text-sm font-bold text-[#666666] uppercase tracking-wide">{viewLevel || '100L'} Section</span>
                </div>
                <motion.div animate={{ rotate: isLevelOpen ? 180 : 0 }} className="text-gray-400">
                  <ChevronDown size={16} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isLevelOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLevelOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+8px)] w-full min-w-[220px] bg-white border border-gray-100 shadow-2xl rounded-[8px] py-3 z-50 overflow-hidden"
                    >
                      <div className="px-5 pb-3 mb-2 border-b border-gray-50 flex items-center gap-2">
                        <Layout size={14} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Session Level</span>
                      </div>
                      {['100L', '200L', '300L', '400L'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => { handleLevelChange(lvl); setIsLevelOpen(false); }}
                          className={`w-full text-left px-5 py-3 text-sm font-bold transition-all flex items-center justify-between group ${viewLevel === lvl ? 'text-mouau-green bg-mouau-green/5' : 'text-gray-600 hover:bg-gray-50 hover:text-mouau-green'}`}
                        >
                          <span className="translate-x-0 group-hover:translate-x-1 transition-transform">{lvl} Courseware</span>
                          {viewLevel === lvl && (
                            <motion.div layoutId="activeLevelIndicator" className="w-2 h-2 rounded-full bg-mouau-green shadow-[0_0_8px_rgba(0,104,55,0.5)]" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Dynamic Learning Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">
              {searchTerm ? 'Search Results' : `Course Materials (${viewLevel || '100L'})`}
            </h2>
            <div className="flex items-center gap-2 text-mouau-green text-sm font-bold uppercase tracking-widest">
              <Layout size={16} />
              <span>{displayMaterials?.length || 0} Materials</span>
            </div>
          </div>

          {loading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-[4px]" />
               ))}
             </div>
          ) : displayMaterials.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900">No courses found</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                {searchTerm 
                  ? `We couldn't find any materials matching "${searchTerm}" across any level.` 
                  : `There are currently no uploaded materials for ${viewLevel}.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayMaterials.map((material) => (
                <div key={material.id} className="bg-white rounded-[4px] border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row items-center justify-between p-6 hover:border-mouau-green transition-all gap-4">
                  <div className="flex-1 w-full text-left">
                     <div className="flex items-center gap-4 mb-2">
                       <span className="font-bold text-mouau-green tracking-tight font-mono bg-mouau-green/5 px-3 py-1 rounded">{material.courseCode}</span>
                       <span className="text-[10px] font-bold text-mouau-gold bg-mouau-gold/10 px-2 py-1 rounded uppercase tracking-wider">{material.level}</span>
                       <span className="text-xs text-gray-400 font-medium uppercase tracking-wider hidden sm:inline">{material.semester} Semester</span>
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
        {searchTerm === '' && (
          <section className="bg-gray-50 rounded-[4px] p-10 border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-serif font-bold text-[#1a1a1a] flex items-center gap-3">
                <Bell className="text-mouau-gold" size={24} />
                Internal Bulletins ({viewLevel})
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
        )}
      </main>
    </div>
    </>
  );
};

export default StudentDashboard;
