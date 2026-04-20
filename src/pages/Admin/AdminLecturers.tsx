import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, Ban, Unlock, CheckCircle, Pencil, Trash2, LogOut, X } from 'lucide-react';

const AdminLecturers = () => {
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'lecturer'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLecturers(docs);
    });
    return () => unsub();
  }, []);

  const handleSuspendToggle = async (userId: string, isCurrentlySuspended: boolean) => {
    if (confirm(`Are you sure you want to ${isCurrentlySuspended ? 'UNSUSPEND' : 'SUSPEND'} this lecturer? They will still be able to log in, but everything will be locked.`)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          is_suspended: !isCurrentlySuspended,
        });
      } catch (err) {
        alert("Failed to update suspension status.");
      }
    }
  };

  const handleKick = async (userId: string) => {
    if (confirm("Are you sure you want to KICK this lecturer? They will be forcefully logged out of their current session immediately.")) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          force_logout: true
        });
      } catch (err) {
        alert("Failed to kick user.");
      }
    }
  };

  const handleBan = async (userId: string) => {
    if (confirm("WARNING: Are you sure you want to BAN and DELETE this lecturer? Their account database record will be permanently erased. They must register again and be re-approved from scratch.")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        alert("Failed to delete user record.");
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editName,
        email: editEmail
      });
      setEditingUser(null);
    } catch (err) {
      alert("Failed to update user details.");
    }
  };

  const openEditModal = (lecturer: any) => {
    setEditingUser(lecturer);
    setEditName(lecturer.name || '');
    setEditEmail(lecturer.email || '');
  };

  const handleApprove = async (userId: string) => {
    if (confirm("Approve this lecturer for portal access?")) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          is_approved: true
        });
      } catch (err) {
        alert("Failed to approve lecturer.");
      }
    }
  };

  const filteredLecturers = lecturers.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOnline = (last_active: any) => {
    if (!last_active || !last_active.toMillis) return false;
    return (Date.now() - last_active.toMillis()) <= 120000;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Lecturer Directory</h2>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 focus:border-mouau-green outline-none transition-colors text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lecturer Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email/Pass Req</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Verification</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLecturers.map((lecturer) => (
                <tr key={lecturer.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${lecturer.is_suspended ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <span className={`w-2.5 h-2.5 rounded-full ${isOnline(lecturer.last_active) && !lecturer.is_suspended && lecturer.is_approved ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                       <span className={`text-xs font-medium ${lecturer.is_suspended ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                         {lecturer.is_suspended ? 'Suspended' : (isOnline(lecturer.last_active) ? 'Online' : 'Offline')}
                       </span>
                     </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{lecturer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div>{lecturer.email}</div>
                    <div className="text-[10px] text-gray-400 italic mt-0.5" title="Due to Firebase Auth security, use the manual edit for DB update, and have them use 'Forgot Password' for Auth.">Encrypted</div>
                  </td>
                  <td className="px-6 py-4">
                    {lecturer.is_approved ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold flex items-center gap-1 w-max">
                        <CheckCircle size={12} /> Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-bold w-max">
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                    {!lecturer.is_approved && (
                      <button 
                        onClick={() => handleApprove(lecturer.id)}
                        className="p-2 bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                        title="Approve Lecturer"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => openEditModal(lecturer)}
                      className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                      title="Edit Lecturer Database Record"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleKick(lecturer.id)}
                      className="p-2 rounded-lg transition-colors bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50"
                      title="Kick User (Force Logout)"
                    >
                      <LogOut size={16} />
                    </button>
                    <button 
                      onClick={() => handleSuspendToggle(lecturer.id, !!lecturer.is_suspended)}
                      className={`p-2 rounded-lg transition-colors ${lecturer.is_suspended ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50'}`}
                      title={lecturer.is_suspended ? "Un-Suspend User" : "Suspend User"}
                    >
                      {lecturer.is_suspended ? <Unlock size={16} /> : <Ban size={16} />}
                    </button>
                    <button 
                      onClick={() => handleBan(lecturer.id)}
                      className="p-2 rounded-lg transition-colors bg-black text-white hover:bg-gray-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900 border border-transparent dark:border-red-800"
                      title="Ban & Delete User Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLecturers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                    No lecturers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-mouau-green px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg">Edit Database Record</h2>
              <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/20 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 p-3 text-xs rounded border border-yellow-200 dark:border-yellow-900/50 mb-4">
                <strong>Note:</strong> Editing the email here changes it in the database view. To execute a strict Auth Password/Email bypass, the user must process a reset manually from the login page, or use Firebase Console.
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Name</label>
                <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-700 outline-none text-gray-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Database Email</label>
                <input required type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-700 outline-none text-gray-900 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 font-bold transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-mouau-green hover:bg-[#00522b] text-white rounded font-bold transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLecturers;
