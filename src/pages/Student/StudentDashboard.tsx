import React, { useState, useEffect } from 'react';
import { Book, Search, LogOut, Clock, Star, FileText, Layout, Info, ChevronDown, ChevronUp, ExternalLink, HelpCircle, Sparkles, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Material, Bulletin } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import QuizModal from '../../components/Student/QuizModal';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState<string>(() => {
    return sessionStorage.getItem('activeLevel') || user?.level || '100L';
  });

  useEffect(() => {
    if (viewLevel) {
      sessionStorage.setItem('activeLevel', viewLevel);
    }
  }, [viewLevel]);

  // Sync viewLevel with user.level if it's the first time it loads and nothing is in session
  useEffect(() => {
    const savedLevel = sessionStorage.getItem('activeLevel');
    if (!savedLevel && user?.level) {
      setViewLevel(user.level);
    }
  }, [user?.level]);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quizInfo, setQuizInfo] = useState<{ courseTitle: string; materialText: string } | null>(null);

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
    // Load from sessionStorage if exists, otherwise use user's level
    const sessionLevel = sessionStorage.getItem('activeLevel');
    if (sessionLevel) {
      setViewLevel(sessionLevel);
    } else if (user.level) {
      setViewLevel(user.level);
    }
  }, [user?.uid, user?.level]);

  const handleLevelChange = (lvl: string) => {
    setViewLevel(lvl);
    sessionStorage.setItem('activeLevel', lvl);
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
            onClick={() => navigate('/research-assistant')}
            className="flex items-center gap-2 bg-mouau-gold/20 text-mouau-gold px-3 py-1.5 rounded-lg border border-mouau-gold/30 hover:bg-mouau-gold/30 transition-all font-bold text-xs"
          >
            <Sparkles size={16} />
            <span>MOUAU AI Assistant</span>
          </button>
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
            <div className="relative group">
              <button className="bg-white px-5 py-3 rounded-[4px] border border-gray-100 shadow-sm flex items-center gap-3 cursor-pointer hover:border-mouau-green transition-all group-hover:shadow-md">
                <Clock className="text-mouau-green" size={18} />
                <span className="text-sm font-bold text-[#666666] uppercase tracking-wide">{viewLevel || '100L'} Section</span>
                <ChevronDown size={14} className="text-gray-400 group-hover:rotate-180 transition-transform" />
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-2xl rounded-[4px] py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="px-4 pb-2 mb-2 border-b border-gray-50">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Level</span>
                </div>
                {['100L', '200L', '300L', '400L'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleLevelChange(lvl)}
                    className={`w-full text-left px-5 py-2.5 text-sm font-bold transition-colors flex items-center justify-between ${viewLevel === lvl ? 'text-mouau-green bg-mouau-green/5' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{lvl} Course Materials</span>
                    {viewLevel === lvl && <div className="w-1.5 h-1.5 rounded-full bg-mouau-green" />}
                  </button>
                ))}
                <div className="mt-2 pt-2 border-t border-gray-50 px-4">
                  <p className="text-[9px] text-gray-400 italic">Temporary Session View</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Learning Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">Curated learning for {viewLevel || '100L'}</h2>
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
                <div key={material.id} className="bg-white rounded-[4px] border border-gray-100 shadow-sm overflow-hidden hover:border-mouau-green transition-all">
                  <button 
                    onClick={() => setExpandedId(expandedId === material.id ? null : material.id)}
                    className="w-full px-8 py-5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-8 flex-1">
                      <div className="w-20 font-bold text-mouau-green tracking-tight font-mono">{material.courseCode}</div>
                      <div className="font-serif font-bold text-lg text-gray-900 flex-1 truncate text-left">{material.courseTitle}</div>
                      <div className="text-sm text-gray-400 font-medium italic hidden md:block w-48 text-right underline decoration-mouau-green/20 underline-offset-4">Lecturer: {material.lecturerName}</div>
                    </div>
                    <div className={`p-2 rounded-full transition-colors ${expandedId === material.id ? 'bg-mouau-green text-white' : 'text-gray-300 group-hover:text-mouau-green'}`}>
                      {expandedId === material.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === material.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-8 pb-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-gray-50 bg-gray-50/30">
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-mouau-green uppercase tracking-[2.5px] flex items-center gap-2">
                              <Star size={14} className="fill-mouau-green" />
                              Key Academic Topics
                            </h4>
                            <ul className="space-y-3">
                              {(material.keyTopics || ['Detailed topics extraction in progress...', 'Contact coordinator for full syllabus', 'Core foundations and concepts']).map((topic, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                                  <div className="w-1.5 h-1.5 rounded-full bg-mouau-gold shrink-0" />
                                  {topic}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex flex-col h-full">
                            <h4 className="text-[11px] font-bold text-[#999] uppercase tracking-[2.5px] mb-4">Brief Resource Overview</h4>
                            <p className="text-gray-600 text-sm italic font-serif leading-relaxed flex-1">
                              {material.overview || "This comprehensive academic resource provides a foundational look into the core principles of the course, curated specifically for MOUAU standards."}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-6">
                              <button
                                onClick={() => navigate(`/course/${material.id}`)}
                                className="flex items-center justify-center gap-2 bg-mouau-green text-white px-6 py-3 rounded-[4px] font-bold text-xs uppercase tracking-widest hover:bg-[#00522b] transition-all shadow-lg shadow-mouau-green/20"
                              >
                                <ExternalLink size={14} />
                                Read Now
                              </button>
                              
                              <button
                                onClick={() => setQuizInfo({ courseTitle: material.courseTitle, materialText: material.extractedText || '' })}
                                className="flex items-center justify-center gap-2 bg-white border border-mouau-green text-mouau-green px-6 py-3 rounded-[4px] font-bold text-xs uppercase tracking-widest hover:bg-mouau-green/5 transition-all"
                              >
                                <HelpCircle size={14} />
                                Take Practice Quiz
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

      <AnimatePresence>
        {quizInfo && (
          <QuizModal 
            isOpen={true} 
            onClose={() => setQuizInfo(null)}
            courseTitle={quizInfo.courseTitle}
            materialText={quizInfo.materialText}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default StudentDashboard;
