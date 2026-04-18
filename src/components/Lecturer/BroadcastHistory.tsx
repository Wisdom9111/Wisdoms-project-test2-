import React, { useState } from 'react';
import { Trash2, Loader2, Bell } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Bulletin } from '../../types';

interface BroadcastHistoryProps {
  notices: Bulletin[];
  onNoticeDeleted: (id: string) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const BroadcastHistory: React.FC<BroadcastHistoryProps> = ({ notices, onNoticeDeleted, setToast }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteNotice = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this broadcast?")) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'notices', id));
      onNoticeDeleted(id);
      setToast({ message: 'Broadcast purged successfully.', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notices/${id}`);
      setToast({ message: 'Failed to remove broadcast.', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-[4px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="font-serif font-bold text-lg text-[#1a1a1a]">Broadcast History</h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{notices.length} Sent</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {notices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 italic">No bulletin history found.</div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} className="p-6 hover:bg-gray-50 transition-colors group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{notice.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-mouau-green bg-mouau-green/5 px-2 py-0.5 rounded-full">{notice.targetLevel}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {notice.createdAt?.toDate ? new Date(notice.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteNotice(notice.id)}
                  disabled={deletingId === notice.id}
                  className={`p-1.5 transition-colors rounded-full ${
                    deletingId === notice.id 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  aria-label="Delete Broadcast"
                >
                  {deletingId === notice.id ? (
                    <Loader2 size={16} className="animate-spin text-mouau-green" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BroadcastHistory;
