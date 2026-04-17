import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, FileText, X } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const UploadMaterial: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    courseCode: '',
    courseTitle: '',
    level: '300L',
    semester: 'First'
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF and Word documents are allowed.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) {
      if (!selectedFile) setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Upload file using Vercel Blob client-side SDK (handleUpload flow)
      const newBlob = await upload(selectedFile.name, selectedFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (progressEvent) => {
          setUploadProgress(progressEvent.percentage);
        },
      });

      const secureUrl = newBlob.url;

      // 2. Save metadata to Firestore
      await addDoc(collection(db, 'materials'), {
        ...formData,
        fileUrl: secureUrl,
        fileName: selectedFile.name,
        lecturerName: user.name,
        lecturerUid: user.uid,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setSelectedFile(null);
      setFormData({
        courseCode: '',
        courseTitle: '',
        level: '300L',
        semester: 'First'
      });
      
      setTimeout(() => navigate('/lecturer-dashboard'), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload material. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/lecturer-dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-mouau-green mb-10 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-[2px] text-[11px]">Return to Portal</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[4px] shadow-2xl shadow-mouau-green/5 border border-gray-100 overflow-hidden"
        >
          <div className="bg-mouau-green p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl font-serif font-bold">Publish Courseware</h1>
              <p className="opacity-80 mt-3 font-serif italic text-lg max-w-xl">"Empowering the next generation through shared knowledge and digital innovation."</p>
            </div>
            {/* Decorative background logo */}
            <div className="absolute top-1/2 -right-10 -translate-y-1/2 opacity-10 font-serif text-[180px] select-none pointer-events-none">
              M
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-[4px] flex items-center gap-4 border border-red-100 italic font-serif">
                <AlertCircle size={24} />
                <span className="font-bold">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-mouau-green p-5 rounded-[4px] flex items-center gap-4 border border-green-100 italic font-serif">
                <CheckCircle2 size={24} />
                <span className="font-bold">Resource published successfully. Synchronizing with student portal...</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#666666] uppercase tracking-[2px] block">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC 301"
                  className="w-full px-5 py-4 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green transition-all bg-gray-50/30 font-medium"
                  value={formData.courseCode}
                  onChange={e => setFormData({...formData, courseCode: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#666666] uppercase tracking-[2px] block">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Communication"
                  className="w-full px-5 py-4 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green transition-all bg-gray-50/30 font-medium"
                  value={formData.courseTitle}
                  onChange={e => setFormData({...formData, courseTitle: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-[#666666] uppercase tracking-[2px] block">Material Resource File</label>
              
              {!selectedFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-[4px] p-12 text-center hover:border-mouau-green transition-all cursor-pointer bg-gray-50/50 group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".pdf,.doc,.docx"
                  />
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                    <Upload className="text-mouau-green" size={24} />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-gray-900 leading-tight">Click to browse or drag & drop</h3>
                  <p className="text-gray-500 mt-2 text-sm italic">Academic resources: PDF, DOC, or DOCX (Max: 10MB)</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-5 bg-gray-50 border border-mouau-green/20 rounded-[4px]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-mouau-green text-white rounded-[4px] flex items-center justify-center font-bold">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for publication</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#666666] uppercase tracking-[2px] block">Academic Level</label>
                <select
                  className="w-full px-5 py-4 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green bg-white font-bold text-gray-700 italic font-serif"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
                >
                  {['100L', '200L', '300L', '400L'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#666666] uppercase tracking-[2px] block">Semester</label>
                <select
                  className="w-full px-5 py-4 border border-gray-200 rounded-[4px] outline-none focus:border-mouau-green bg-white font-bold text-gray-700 italic font-serif"
                  value={formData.semester}
                  onChange={e => setFormData({...formData, semester: e.target.value})}
                >
                  <option value="First">First Semester</option>
                  <option value="Second">Second Semester</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-5 rounded-[4px] font-bold text-white shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 mt-10 text-[16px] uppercase tracking-[2px] ${loading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-mouau-green hover:bg-[#00522b] shadow-mouau-green/30'}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading to Secure Vault...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>Publish to Portal</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default UploadMaterial;
