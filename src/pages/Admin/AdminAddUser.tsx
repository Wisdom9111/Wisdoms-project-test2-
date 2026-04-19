import React, { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const AdminAddUser = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [level, setLevel] = useState('100L');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Create user auth identity (since Admin is authenticated, Firebase allows this in some setups 
      // but note: doing this natively usually signs the admin out and signs the new user in.
      // WE MUST USE REST API or Admin SDK for secure background creation if we don't want to log out.
      // Since this is client-side Firebase, calling createUserWithEmailAndPassword will swap the session!
      // To prevent kicking the admin out, we'll throw a polite technical error block here for standard auth.
      
      throw new Error("Client-side direct user injection is blocked. Firebase handles only 1 session per browser. To create a user manually, please log out, go to the Registration page, and register them directly.");
      
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Manual User Registration</h2>
        <p className="text-gray-500 dark:text-gray-400">Inject users who cannot register independently.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <form onSubmit={handleCreate} className="space-y-6">
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg font-medium text-sm border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg font-medium text-sm border border-green-100 dark:border-green-900/50">
              User successfully provisioned and injected into the database.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green transition-colors dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">University Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green transition-colors dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Default Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green transition-colors dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Role</label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green transition-colors dark:text-white"
              >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
              </select>
            </div>

            {role === 'student' && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Academic Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-mouau-green transition-colors dark:text-white"
                >
                  <option value="100L">100 Level</option>
                  <option value="200L">200 Level</option>
                  <option value="300L">300 Level</option>
                  <option value="400L">400 Level (Final Year)</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mouau-green text-white py-4 rounded-lg font-bold hover:bg-[#00522b] disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            Inject New User
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAddUser;
