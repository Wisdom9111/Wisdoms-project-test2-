import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, Trash2, FileText } from 'lucide-react';

const AdminMaterials = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'materials'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(docs);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (matId: string, title: string) => {
    if (confirm(`Are you sure you want to PERMANENTLY delete the material: "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'materials', matId));
      } catch (err) {
        alert("Failed to delete material.");
      }
    }
  };

  const filtered = materials.filter(m => 
    m.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.lecturerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Global Vault</h2>
           <p className="text-gray-500 dark:text-gray-400">Manage all materials uploaded to the system.</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search code, title, or author..."
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
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Uploaded By</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Level / Sem</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((mat) => (
              <tr key={mat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-mouau-green/10 text-mouau-green rounded">
                      <FileText size={20} />
                    </div>
                    <div>
                       <div className="font-bold text-gray-900 dark:text-gray-100">{mat.courseCode}</div>
                       <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{mat.courseTitle}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{mat.lecturerName}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-bold">
                    {mat.level} • {mat.semester}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {mat.createdAt?.toMillis ? new Date(mat.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(mat.id, mat.courseTitle)}
                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                    title="Permanently Delete Material"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                  No materials found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMaterials;
