import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, Lock } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Material } from '../../types';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

const CourseView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setMaterial({ id: docSnap.id, ...docSnap.data() } as Material);
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
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col select-none">
      {/* Secure Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-mouau-green"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="border-l border-gray-200 pl-6">
            <h1 className="text-lg font-serif font-bold text-gray-900 truncate max-w-[300px]">
              {material.courseCode}: {material.courseTitle}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Digital Courseware • {material.lecturerName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-4 py-2 bg-mouau-green/5 rounded-full border border-mouau-green/20">
          <Shield size={16} className="text-mouau-green" />
          <span className="text-[11px] font-bold text-mouau-green uppercase tracking-wider">Secure Access Protocol Active</span>
        </div>
      </header>

      {/* Reader Container */}
      <div className="flex-1 overflow-hidden relative group">
        {/* Anti-Copy Overlay Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'transparent' }}>
            {/* This transparent div captures nothing but visual inspection is hard */}
        </div>
        
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

        <div className="h-full w-full max-w-5xl mx-auto bg-white shadow-2xl relative">
          {/* Transparent Overlay to Prevent Dragging/Selecting directly on the viewer */}
          <div 
            className="absolute inset-0 z-10 cursor-default" 
            onContextMenu={(e) => e.preventDefault()}
          />

          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <div className="h-full overflow-auto secure-scrollbar">
              <Viewer 
                fileUrl={material.fileUrl}
              />
            </div>
          </Worker>
          
          <div className="absolute bottom-6 right-6 z-20">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              <Lock size={12} />
              Read-Only Restricted Mode
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Warning */}
      <footer className="bg-black text-[10px] text-gray-500 py-3 text-center uppercase tracking-widest border-t border-white/5 font-medium">
        © MOUAU Digital Library • Unauthorized Redistribution is strictly prohibited • Monitored Session
      </footer>
    </div>
  );
};

export default CourseView;
