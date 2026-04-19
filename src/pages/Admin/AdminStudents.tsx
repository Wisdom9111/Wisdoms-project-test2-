import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, Ban, Unlock, Pencil, Trash2 } from 'lucide-react';

const AdminStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(docs);
    });
    return () => unsub();
  }, []);

  const handleSuspendToggle = async (userId: string, isCurrentlySuspended: boolean) => {
    if (confirm(`Are you sure you want to ${isCurrentlySuspended ? 'UNSUSPEND' : 'SUSPEND'} this user?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          is_suspended: !isCurrentlySuspended,
          last_active: null // boot them out effectively on next check
        });
      } catch (err) {
        alert("Failed to update suspension status.");
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOnline = (last_active: any) => {
    if (!last_active || !last_active.toMillis) return false;
    return (Date.now() - last_active.toMillis()) <= 120000;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Student Directory</h2>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 focus:border-mouau-green outline-none transition-colors"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStudents.map((student) => (
              <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${student.is_suspended ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <span className={`w-2.5 h-2.5 rounded-full ${isOnline(student.last_active) && !student.is_suspended ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                     <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                       {student.is_suspended ? 'Suspended' : (isOnline(student.last_active) ? 'Online' : 'Offline')}
                     </span>
                   </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{student.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold">
                    {student.level || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleSuspendToggle(student.id, !!student.is_suspended)}
                    className={`p-2 rounded-lg transition-colors ${student.is_suspended ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50'}`}
                    title={student.is_suspended ? "Un-Suspend User" : "Suspend User"}
                  >
                    {student.is_suspended ? <Unlock size={16} /> : <Ban size={16} />}
                  </button>
                  {/* Password seeing is blocked cryptographically by Google, warn Admin if they try to do a feature we technically skip */}
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                  No students found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStudents;
