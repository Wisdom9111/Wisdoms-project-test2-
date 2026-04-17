import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Book, ArrowLeft, Send, Loader2, Info, FileText, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { researchAssistantQuery } from '../../services/geminiService';
import { Material } from '../../types';

const ResearchAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [fetchingDocs, setFetchingDocs] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const q = query(collection(db, 'materials'));
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[];
        setMaterials(docs);
      } catch (err) {
        console.error("Error fetching materials for research:", err);
      } finally {
        setFetchingDocs(false);
      }
    };
    fetchMaterials();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || fetchingDocs) return;

    setLoading(true);
    setAnswer(null);

    // Prepare documentation context
    const docsForAI = materials
      .filter(m => m.extractedText)
      .map(m => ({
        code: m.courseCode,
        title: m.courseTitle,
        content: m.extractedText!
      }));

    try {
      const response = await researchAssistantQuery(question, docsForAI);
      setAnswer(response);
    } catch (err) {
      console.error(err);
      setAnswer("Our academic neural link is currently unstable. Please try referencing the physical courseware.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col">
      <nav className="bg-[#006837] text-white px-8 py-5 flex items-center justify-between shadow-xl sticky top-0 z-[60]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/student-dashboard')} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <Sparkles className="text-mouau-gold" size={24} />
            <h1 className="text-2xl font-serif font-bold tracking-tight">MOUAU AI Research Assistant</h1>
          </div>
        </div>
        <div className="hidden md:block text-[10px] font-bold uppercase tracking-[3px] opacity-70">
          Michael Okpara University of Agriculture, Umudike
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-12 space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-mouau-green/5 border border-mouau-green/20 rounded-full text-mouau-green text-[10px] font-bold uppercase tracking-widest text-center mx-auto">
            <Info size={14} />
            Semantic Cross-Document Search Active
          </div>
          <h2 className="text-5xl font-serif font-bold text-[#1a1a1a]">Intelligent Academic Inquiry</h2>
          <p className="max-w-2xl mx-auto text-gray-500 font-medium leading-relaxed">
            Query the entire departmental digital library using natural language. Our AI scans every uploaded PDF to find direct answers and academic citations.
          </p>
        </header>

        <section className="bg-white rounded-[4px] shadow-2xl shadow-mouau-green/5 border border-gray-100 overflow-hidden">
          <form onSubmit={handleSearch} className="p-8 md:p-12 space-y-8">
            <div className="relative">
              <textarea
                className="w-full min-h-[140px] p-8 bg-gray-50 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green transition-all font-serif text-xl placeholder:italic resize-none shadow-inner"
                placeholder="Ask anything (e.g., 'What are the core components of a data communication system mentioned in CSC 301?')"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hidden sm:block">Press Shift + Enter to newline</p>
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className={`bg-mouau-green text-white px-8 py-3 rounded-[4px] font-bold flex items-center gap-3 transition-all ${loading || !question.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00522b] shadow-lg shadow-mouau-green/20 hover:scale-105'}`}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  <span className="uppercase tracking-[2px] text-xs">Analyze Repository</span>
                </button>
              </div>
            </div>
          </form>

          <AnimatePresence>
            {answer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-100 bg-gray-50/50 p-8 md:p-12"
              >
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-mouau-gold/20 text-mouau-gold rounded-full flex items-center justify-center shrink-0 border border-mouau-gold/30">
                    <Sparkles size={24} />
                  </div>
                  <div className="space-y-6 flex-1">
                    <div className="prose prose-mouau max-w-none">
                      <p className="text-lg font-serif leading-relaxed text-[#2a2a2a] whitespace-pre-wrap">
                        {answer}
                      </p>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <FileText size={14} />
                        Powered by MOUAU AI Infrastructure
                      </div>
                      <button 
                        onClick={() => { setAnswer(null); setQuestion(''); }}
                        className="text-[10px] font-bold text-mouau-green uppercase tracking-widest hover:underline"
                      >
                        New Inquiry
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {!answer && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white border border-gray-100 rounded-[4px] space-y-3">
              <Search className="text-mouau-green" size={24} />
              <h3 className="font-serif font-bold text-[#1a1a1a]">Global Search</h3>
              <p className="text-sm text-gray-500 italic">"Find info across all levels and materials simultaneously."</p>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-[4px] space-y-3">
              <Book className="text-mouau-green" size={24} />
              <h3 className="font-serif font-bold text-[#1a1a1a]">Citations</h3>
              <p className="text-sm text-gray-500 italic">"Every answer includes references to the original document."</p>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-[4px] space-y-3">
              <div className="w-6 h-6 bg-mouau-gold/20 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-mouau-gold rounded-full" />
              </div>
              <h3 className="font-serif font-bold text-[#1a1a1a]">Real-time</h3>
              <p className="text-sm text-gray-500 italic">"Search updates as soon as lecturers publish new content."</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResearchAssistant;
