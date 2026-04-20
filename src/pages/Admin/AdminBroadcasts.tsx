import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Megaphone, Plus } from 'lucide-react';

const AdminBroadcasts = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [targetLevel, setTargetLevel] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(docs);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this broadcast?")) {
      await deleteDoc(doc(db, 'notices', id));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'notices'), {
        content: newContent,
        targetLevel,
        lecturerName: 'System Administrator',
        lecturerUid: user?.uid,
        createdAt: serverTimestamp()
      });
      setNewContent('');
      setShowAddForm(false);
    } catch (err) {
      alert("Failed to send broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Broadcast Center</h2>
           <p className="text-gray-500 dark:text-gray-400">Manage Lecturer announcements and transmit global Server Alerts.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-mouau-green hover:bg-[#00522b] text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          {showAddForm ? 'Cancel' : <><Plus size={18} /> New Broadcast</>}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
            <Megaphone size={20} className="text-mouau-gold" /> Compose System Broadcast
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Message Content</label>
              <textarea 
                required
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="e.g. The website is currently on maintenance..."
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green dark:text-white min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Target Audience</label>
              <select 
                value={targetLevel} 
                onChange={e => setTargetLevel(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green dark:text-white"
              >
                <option value="all">Global (All Users)</option>
                <option value="100L">100L Students</option>
                <option value="200L">200L Students</option>
                <option value="300L">300L Students</option>
                <option value="400L">400L Students</option>
                <option value="500L">500L Students</option>
              </select>
            </div>
            <button 
              disabled={isSubmitting}
              type="submit" 
              className="w-full bg-mouau-green hover:bg-[#00522b] text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Transmitting...' : 'Transmit Broadcast'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto w-full">
        <table className="w-full text-left whitespace-nowrap min-w-[700px]">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Message</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Author</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {notices.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${b.targetLevel === 'all' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                    {b.targetLevel === 'all' ? 'GLOBAL' : b.targetLevel}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="text-gray-900 dark:text-gray-100 truncate max-w-sm whitespace-normal text-sm font-medium">
                     {b.content}
                   </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {b.lecturerName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {b.createdAt?.toMillis ? new Date(b.createdAt.toMillis()).toLocaleString() : 'Just now'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(b.id)}
                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors inline-flex"
                    title="Delete Broadcast"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {notices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                  No active broadcasts found on the system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBroadcasts;
