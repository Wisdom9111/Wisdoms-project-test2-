import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, Lock, Sparkles, Loader2, List, BookOpen, MessageSquare, Send } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Material } from '../../types';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const SecureViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{topics: string[], overview: string} | null>(null);

  // Document Chat State
  const [docChatMessages, setDocChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Document Page state
  const [initialPage, setInitialPage] = useState(0);

  useEffect(() => {
    // Disable right-click for security
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    const fetchMaterial = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'materials', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const matData = { id: docSnap.id, ...docSnap.data() } as Material;
          setMaterial(matData);
          
          // Load document position tracking
          const savedPage = localStorage.getItem(`mouau_doc_page_${id}`);
          if (savedPage) {
            setInitialPage(parseInt(savedPage, 10));
          }

          // Pre-load saved analysis if exists
          if (matData.keyTopics && matData.overview) {
            setAiAnalysis({ topics: matData.keyTopics, overview: matData.overview });
          }
        } else {
          setError('Material not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load courseware.');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [id]);

  const generateAiSummary = async () => {
    if (!material) return;
    
    setIsAiPanelOpen(true);
    
    // Skip if we already generated it
    if (aiAnalysis) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: material.fileUrl,
          courseCode: material.courseCode,
          courseTitle: material.courseTitle
        }),
      });

      if (!res.ok) throw new Error('AI analysis failed');
      const data = await res.json();
      
      setAiAnalysis({ topics: data.topics, overview: data.overview });

      // Cache the analysis to Firestore so it loads instantly next time
      try {
        await updateDoc(doc(db, 'materials', material.id), {
          keyTopics: data.topics,
          overview: data.overview
        });
      } catch (fbErr) {
        console.warn('Could not cache AI response', fbErr);
      }
      
    } catch (err) {
      console.error(err);
      // Fallback silently if it completely crashes so we don't break the UI
      setAiAnalysis({
        topics: ['Overview', 'Fundamentals', 'Document Structure'],
        overview: 'This document contains securely formatted academic material. The AI was temporarily unable to parse the precise content, but you may read the document manually.'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const sendDocQuestion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading || !material) return;

    const question = chatInput.trim();
    setChatInput('');
    setDocChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);

    // Auto-scroll chat to bottom
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);

    try {
      const res = await fetch('/api/ai-doc-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: material.fileUrl,
          courseCode: material.courseCode,
          courseTitle: material.courseTitle,
          query: question,
          history: docChatMessages
        }),
      });

      if (!res.ok) throw new Error('Document chat failed');
      const data = await res.json();
      
      setDocChatMessages(prev => [...prev, { role: 'ai', text: data.answer || data.error }]);
    } catch (err) {
      console.error(err);
      setDocChatMessages(prev => [...prev, { role: 'ai', text: "⚠️ Unable to connect to Demic_AI. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-bold text-xs text-gray-400">
        Initializing Secure Reader...
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-gray-900">{error}</h2>
        <button onClick={() => navigate('/student-dashboard')} className="mt-6 text-mouau-green font-bold underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col select-none relative overflow-hidden">
      {/* Secure Header */}
      <header className="bg-white px-2 sm:px-6 py-4 flex items-center justify-between border-b border-gray-100 z-30">
        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-mouau-green"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="border-l border-gray-200 pl-4 sm:pl-6">
            <h1 className="text-sm sm:text-lg font-serif font-bold text-gray-900 truncate max-w-[150px] sm:max-w-[400px]">
              {material.courseCode}: {material.courseTitle}
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
              Digital Courseware • {material.lecturerName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={generateAiSummary}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold text-[11px] uppercase tracking-wider hover:shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all cursor-pointer"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Demic_AI Scan</span>
            <span className="sm:hidden">AI Scan</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-mouau-green/5 rounded-full border border-mouau-green/20">
            <Shield size={14} className="text-mouau-green" />
            <span className="text-[10px] font-bold text-mouau-green uppercase tracking-wider">Secure</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Anti-Copy Overlay Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-transparent" />
        
        {/* Printable Blocking CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { display: none !important; }
            * { display: none !important; }
          }
          .rpv-core__viewer {
            user-select: none !important;
          }
        `}} />

        {/* PDF Reader Container */}
        <div className="flex-1 h-full max-w-5xl mx-auto bg-white shadow-2xl relative transition-all duration-300">
          <div 
            className="absolute inset-0 z-10 cursor-default" 
            onContextMenu={(e) => e.preventDefault()}
          />

          <div className="h-full w-full relative">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <div className="h-full overflow-auto secure-scrollbar">
                <Viewer 
                  fileUrl={material.fileUrl} 
                  initialPage={initialPage}
                  onPageChange={(e) => {
                    if (material.id) {
                      localStorage.setItem(`mouau_doc_page_${material.id}`, e.currentPage.toString());
                    }
                  }}
                />
              </div>
            </Worker>
          </div>
          
          <div className="absolute bottom-6 right-6 z-20">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              <Lock size={12} />
              Read-Only
            </div>
          </div>
        </div>

        {/* Sliding AI Panel */}
        <AnimatePresence>
          {isAiPanelOpen && (
            <>
              {/* Backdrop for mobile */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="lg:hidden absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={() => setIsAiPanelOpen(false)}
              />
              
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-full lg:w-[400px] z-50 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.2)] border-l border-gray-100 flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-purple-50 to-white flex justify-between items-center">
                  <div className="flex items-center gap-3 text-purple-700">
                    <Sparkles size={24} className="animate-pulse" />
                    <div>
                      <h3 className="font-serif font-bold text-lg leading-tight">Demic_AI Overview</h3>
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Document Intelligence</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAiPanelOpen(false)} className="p-2 hover:bg-purple-100 rounded-full text-purple-400 transition-colors">
                    <ArrowLeft size={18} />
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-gray-50/50 flex flex-col pt-4 pb-24">
                  {aiLoading && !aiAnalysis ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-400 blur-xl opacity-20 rounded-full" />
                        <Loader2 size={40} className="text-purple-600 animate-spin relative z-10" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Demic_AI is reading...</p>
                        <p className="text-xs text-gray-500 mt-1">Analyzing hundreds of pages in seconds.</p>
                      </div>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      {/* What you will learn */}
                      <div className="bg-white p-5 rounded-[8px] shadow-sm border border-purple-100">
                        <div className="flex items-center gap-2 text-purple-600 mb-3">
                          <BookOpen size={16} />
                          <h4 className="font-bold text-sm uppercase tracking-wider">What you will learn</h4>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed font-medium">
                          {aiAnalysis.overview}
                        </p>
                      </div>

                      {/* Key Topics */}
                      <div>
                        <div className="flex items-center gap-2 text-gray-800 mb-4 px-1">
                          <List size={16} className="text-mouau-green" />
                          <h4 className="font-bold text-sm uppercase tracking-wider">Core Topics Covered</h4>
                        </div>
                        <div className="space-y-3">
                          {aiAnalysis.topics.map((topic, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              key={idx} 
                              className="bg-white p-4 rounded-[4px] border border-gray-100 shadow-sm flex items-start gap-4 hover:border-mouau-green hover:shadow-md transition-all"
                            >
                              <div className="bg-mouau-green/10 text-mouau-green w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <span className="font-serif font-bold text-gray-800">{topic}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Document Chat Separator */}
                      <div className="pt-8 border-t border-gray-200/60 mt-4 flex-1 flex flex-col">
                         <div className="text-center mb-6">
                           <span className="bg-gray-100 text-gray-500 py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider">Demic_AI Document Chat</span>
                         </div>
                         
                         <div className="flex-1 space-y-4 pb-4">
                           {docChatMessages.length === 0 ? (
                             <div className="text-center text-sm text-gray-400 font-medium italic mt-4">
                               Ask me a question about any lines, words, or topics confused about in this document...
                             </div>
                           ) : (
                             docChatMessages.map((msg, i) => (
                               <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-[13px] leading-relaxed ${
                                   msg.role === 'user' 
                                     ? 'bg-mouau-green text-white rounded-tr-sm' 
                                     : 'bg-white text-gray-800 border border-purple-100 rounded-tl-sm'
                                 }`}>
                                   {msg.role === 'ai' ? (
                                     <div className="markdown-body text-sm font-medium">
                                       <ReactMarkdown>{msg.text}</ReactMarkdown>
                                     </div>
                                   ) : (
                                     <span className="font-medium">{msg.text}</span>
                                   )}
                                 </div>
                               </div>
                             ))
                           )}
                           
                           {chatLoading && (
                             <div className="flex justify-start">
                               <div className="max-w-[85%] bg-white border border-purple-100 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                                 <Loader2 size={16} className="animate-spin text-purple-500" />
                               </div>
                             </div>
                           )}
                         </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                
                {/* Chat Input Field (Fixed at bottom) */}
                {aiAnalysis && (
                  <div className="absolute bottom-10 left-0 right-0 bg-white border-t border-gray-100 p-4 z-20">
                    <form onSubmit={sendDocQuestion} className="flex items-end gap-2 relative">
                      <div className="flex-1 relative">
                        <textarea
                          rows={2}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendDocQuestion();
                            }
                          }}
                          placeholder="Ask about this document..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 resize-none pr-12 font-medium"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={!chatInput.trim() || chatLoading}
                        className="absolute right-4 bottom-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gray-900 border-t border-gray-800 flex items-center justify-center z-20">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-center items-center gap-2">
                    <Sparkles size={10} className="text-purple-400" />
                    Generated by Demic_AI
                  </span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Warning */}
      <footer className="bg-black text-[10px] text-gray-500 py-3 text-center uppercase tracking-widest border-t border-white/5 font-medium z-30">
        © MOUAU Digital Library • Unauthorized Redistribution is strictly prohibited
      </footer>
    </div>
  );
};

export default SecureViewer;
