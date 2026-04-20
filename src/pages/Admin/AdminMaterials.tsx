import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, Trash2, FileText, BookOpen, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminMaterials = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Edit Modal State
  const [editingMat, setEditingMat] = useState<any | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editSemester, setEditSemester] = useState('');

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

  const openEditModal = (mat: any) => {
    setEditingMat(mat);
    setEditCode(mat.courseCode);
    setEditTitle(mat.courseTitle);
    setEditLevel(mat.level);
    setEditSemester(mat.semester || 'First');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMat) return;
    try {
      await updateDoc(doc(db, 'materials', editingMat.id), {
        courseCode: editCode,
        courseTitle: editTitle,
        level: editLevel,
        semester: editSemester
      });
      setEditingMat(null);
    } catch (err) {
      alert("Failed to update material.");
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
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 focus:border-mouau-green outline-none transition-colors text-gray-900 dark:text-white"
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
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button 
                    onClick={() => navigate(`/course/${mat.id}`)}
                    className="px-3 py-1.5 flex items-center gap-1.5 bg-blue-100/50 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg transition-colors font-bold text-[11px] uppercase tracking-wider"
                    title="Read Document"
                  >
                    <BookOpen size={14} />
                    Read
                  </button>
                  <button 
                    onClick={() => openEditModal(mat)}
                    className="px-3 py-1.5 flex items-center gap-1.5 bg-orange-100/50 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded-lg transition-colors font-bold text-[11px] uppercase tracking-wider"
                    title="Edit Material"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(mat.id, mat.courseTitle)}
                    className="px-3 py-1.5 flex items-center gap-1.5 bg-red-100/50 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors font-bold text-[11px] uppercase tracking-wider"
                    title="Permanently Delete Material"
                  >
                    <Trash2 size={14} />
                    Delete
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

      {editingMat && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit2 size={18} className="text-mouau-green" /> Edit Material
              </h3>
              <button onClick={() => setEditingMat(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Course Code</label>
                <input 
                  type="text" 
                  value={editCode} 
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Course Title</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Target Level</label>
                  <select 
                    value={editLevel} 
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="100L">100L</option>
                    <option value="200L">200L</option>
                    <option value="300L">300L</option>
                    <option value="400L">400L</option>
                    <option value="500L">500L</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                  <select 
                    value={editSemester} 
                    onChange={(e) => setEditSemester(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="First">First</option>
                    <option value="Second">Second</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingMat(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-mouau-green text-white rounded-lg hover:bg-[#00522b] font-bold transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaterials;
