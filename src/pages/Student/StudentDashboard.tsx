import React, { useState, useEffect, useRef } from 'react';
import { Book, Search, LogOut, Clock, Layout, Info, ExternalLink, Bell, ChevronDown, Sparkles, Send, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Material, Bulletin } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

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

  // Demic AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatLoading]);

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

  const handleAiChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const userMsg = chatQuery.trim();
    setChatQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      // Build a string representing the available library to pass to the AI
      const libraryContext = materials.map(m => `- ${m.courseCode}: ${m.courseTitle} (Uploaded by ${m.lecturerName})\n  Topics: ${(m.keyTopics || []).join(', ')}\n  Overview: ${m.overview || 'Not yet analyzed'}`).join('\n\n');

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg,
          libraryContext
        })
      });

      if (!res.ok) throw new Error('Failed to reach AI server');
      
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', content: data.answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Connection error: Demic_AI is currently unreachable. Please try again later.' }]);
    } finally {
      setIsChatLoading(false);
    }
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
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      <nav className="bg-[#006837] text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book size={24} />
              <span className="text-xl font-bold tracking-tight">MOUAU Courseware</span>
            </div>
            
            {/* Mobile Header Actions */}
            <div className="flex items-center gap-2 md:hidden">
              <button 
                onClick={() => setIsChatOpen(true)}
                className="flex items-center justify-center p-2 rounded-lg transition-colors border border-purple-400 bg-purple-500/20 text-purple-100 hover:bg-purple-500/40"
              >
                <Sparkles size={16} />
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors border border-white/20"
              >
                <LogOut size={16} />
              </button>
            </div>
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
            {/* Desktop Actions */}
            <button 
              onClick={() => setIsChatOpen(true)}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all border border-purple-400/30"
            >
              <Sparkles size={16} />
              <span>Demic_AI</span>
            </button>
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
            <div className="relative z-10 w-full md:w-auto">
              <button 
                onClick={() => setIsLevelOpen(!isLevelOpen)}
                className="bg-white w-full px-6 py-3 rounded-[4px] border border-gray-200 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-mouau-green hover:shadow-md transition-all min-w-[200px]"
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
                    <div className="fixed inset-0 z-30" onClick={() => setIsLevelOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+8px)] w-full min-w-[220px] bg-white border border-gray-100 shadow-2xl rounded-[8px] py-3 z-40 overflow-hidden"
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

      {/* Demic AI Multi-Session Chatbot Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 left-0 md:left-auto md:w-[450px] top-[10%] md:top-6 md:bottom-6 md:right-6 bg-white md:rounded-2xl rounded-t-2xl shadow-[-10px_0_40px_rgba(0,0,0,0.3)] z-50 flex flex-col overflow-hidden border border-purple-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-5 flex items-center justify-between shadow-md z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Sparkles size={20} className="text-purple-100" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg leading-tight">Demic_AI</h3>
                    <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold font-mono">Knowledge Assistant</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] flex flex-col gap-6 custom-scrollbar">
                <div className="text-center py-4 bg-purple-50 rounded-lg border border-purple-100 shadow-sm mx-4">
                  <Sparkles size={24} className="text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-purple-900">Hello, {user?.name}!</p>
                  <p className="text-xs text-purple-600 px-4 mt-1">I have awareness of all published MOUAU courseware. What academic topic are you confused about?</p>
                </div>

                {chatHistory.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${msg.role === 'user' ? 'bg-mouau-green text-white rounded-br-sm' : 'bg-white border border-gray-100 rounded-bl-sm'}`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm font-medium">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm prose-p:leading-relaxed prose-headings:font-serif prose-a:text-mouau-green prose-strong:text-purple-800 markdown-body text-gray-800 text-sm font-medium">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isChatLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-6 py-4 shadow-sm flex items-center gap-3 text-purple-600 font-bold text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      Demic_AI is referencing your library...
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white p-4 border-t border-gray-100">
                <form onSubmit={handleAiChatSubmit} className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Ask Demic_AI a question..."
                    disabled={isChatLoading}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-all disabled:opacity-50 text-gray-800 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!chatQuery.trim() || isChatLoading}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full hover:shadow-[0_0_10px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:hover:shadow-none transition-all flex items-center justify-center transform active:scale-95"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default StudentDashboard;
