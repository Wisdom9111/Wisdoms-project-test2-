import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckCircle, XCircle } from 'lucide-react';

const AdminApprovals = () => {
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    // Queries all lecturers where is_approved is strictly false
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'lecturer'),
      where('is_approved', '==', false)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPending(docs);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        is_approved: true
      });
    } catch (err) {
      alert("Failed to approve lecturer.");
    }
  };

  const handleDeny = async (userId: string) => {
    if (confirm("Denying this request will suspend the account permanently. Proceed?")) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          is_suspended: true
        });
      } catch (err) {
        alert("Failed to deny lecturer.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Lecturer Approvals</h2>
           <p className="text-gray-500 dark:text-gray-400">Review and authorize faculty registration requests.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {pending.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto text-green-500 mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">You're all caught up!</h3>
            <p className="text-gray-500 dark:text-gray-400">There are no pending lecturer registrations waiting for approval.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pending.map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="mb-4 sm:mb-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">{req.name}</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{req.email}</p>
                  {req.created_at && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Registered: {new Date(req.created_at.toMillis()).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => handleDeny(req.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/30 rounded-lg font-bold transition-colors"
                  >
                    <XCircle size={18} /> Deny
                  </button>
                  <button 
                    onClick={() => handleApprove(req.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-mouau-green hover:bg-[#00522b] text-white rounded-lg font-bold transition-colors shadow-sm"
                  >
                    <CheckCircle size={18} /> Approve Faculty
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApprovals;
