import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, LogOut, LayoutDashboard, ChevronRight, FileText, Trash2, AlertCircle, X, Bell, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Material, Bulletin } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import BroadcastHistory from '../../components/Lecturer/BroadcastHistory';

const LecturerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recentUploads, setRecentUploads] = useState<Material[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [bulletin, setBulletin] = useState({ content: '', level: '100L' });
  const [bulletinLoading, setBulletinLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [notices, setNotices] = useState<Bulletin[]>([]);

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
      handleFirestoreError(error, OperationType.GET, 'materials');
      setLoading(false);
    });

    // Fetch lecturer notices
    const noticesRef = collection(db, 'notices');
    const noticesQ = query(
      noticesRef,
      where('lecturerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotices = onSnapshot(noticesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bulletin[];
      setNotices(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notices');
    });

    return () => {
      unsubscribe();
      unsubscribeNotices();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const materialToDelete = recentUploads.find(m => m.id === deleteId);
    if (!materialToDelete) return;

    setDeleting(true);
    try {
      // 1. Delete from Vercel Blob via our API
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: materialToDelete.fileUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete file from storage');
      }

      await deleteDoc(doc(db, 'materials', deleteId));
      setDeleteId(null);
      setToast({ message: 'Material purged from digital vault successfully.', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `materials/${deleteId}`);
      setToast({ message: 'Failed to delete resource. Please try again.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handlePostBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bulletin.content.trim()) return;

    setBulletinLoading(true);
    try {
      await addDoc(collection(db, 'notices'), {
        content: bulletin.content,
        targetLevel: bulletin.level,
        lecturerName: user.name,
        lecturerUid: user.uid,
        createdAt: serverTimestamp()
      });
      setBulletin({ content: '', level: '100L' });
      setToast({ message: 'Broadcast published to portal successfully.', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notices');
      setToast({ message: 'Failed to broadcast bulletin.', type: 'error' });
    } finally {
      setBulletinLoading(false);
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
                    <div key={material.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-mouau-green/10 text-mouau-green rounded-[4px] flex items-center justify-center font-bold text-xs border border-mouau-green/20 group-hover:bg-mouau-green group-hover:text-white transition-colors uppercase">
                          PDF
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-lg text-[#1a1a1a] group-hover:text-mouau-green transition-colors">{material.courseCode} - {material.courseTitle}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">Target: {material.level} • {material.semester} Semester</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setDeleteId(material.id)}
                          className="p-2 text-gray-300 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                          title="Delete Material"
                        >
                          <Trash2 size={18} />
                        </button>
                        <a href={material.fileUrl} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-mouau-green transition-colors">
                          <ChevronRight size={20} />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-[4px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-gray-100 bg-mouau-green text-white">
                <h2 className="font-serif font-bold text-xl flex items-center gap-2">
                  <Bell size={20} />
                  Post Internal Bulletin
                </h2>
              </div>
              <form onSubmit={handlePostBulletin} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#666666] uppercase tracking-widest block">Bulletin Message</label>
                  <textarea
                    required
                    value={bulletin.content}
                    onChange={e => setBulletin({ ...bulletin, content: e.target.value })}
                    placeholder="Enter academic notice or bulletin details..."
                    className="w-full h-32 px-4 py-3 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green transition-all bg-gray-50/50 resize-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#666666] uppercase tracking-widest block">Target Student Level</label>
                  <select
                    value={bulletin.level}
                    onChange={e => setBulletin({ ...bulletin, level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green bg-white font-bold italic"
                  >
                    {['100L', '200L', '300L', '400L'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={bulletinLoading}
                  className={`w-full py-4 rounded-[4px] font-bold text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-[12px] ${bulletinLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-mouau-green hover:bg-[#00522b]'}`}
                >
                  {bulletinLoading ? 'Broadcasting...' : 'Broadcast Notice'}
                </button>
              </form>
            </div>

            <BroadcastHistory 
              notices={notices} 
              onNoticeDeleted={(id) => setNotices(prev => prev.filter(n => n.id !== id))}
              setToast={setToast}
            />
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[4px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">Confirm Destruction</h3>
                <p className="text-gray-500 leading-relaxed italic font-serif">
                  Are you certain you wish to remove this academic resource? This action is irreversible and will purge the file from the MOUAU digital vault.
                </p>
              </div>
              
              <div className="flex border-t border-gray-100">
                <button 
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest text-[11px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-4 font-bold bg-red-600 text-white hover:bg-red-700 transition-colors uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>{deleting ? 'Purging...' : 'Confirm Purge'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-[100] px-6 py-3 rounded-[4px] shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-mouau-green border-white/20 text-white' : 'bg-red-600 border-white/20 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LecturerDashboard;
