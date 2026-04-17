import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';
import { Role } from '../../types';
import { motion } from 'motion/react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [level, setLevel] = useState('300L');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(email, password, name, role, role === 'student' ? level : undefined);
      if (role === 'lecturer') {
        navigate('/lecturer-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Try logging in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Registration failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex w-[400px] bg-mouau-green text-white p-[60px] flex-col justify-between relative overflow-hidden shrink-0">
        <div className="relative z-10">
          <div className="mb-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center font-bold text-mouau-green text-2xl border-4 border-mouau-gold mb-6">
              M
            </div>
            <h1 className="font-serif text-[32px] leading-tight mb-2.5">MOUAU</h1>
            <div className="text-[14px] uppercase tracking-[2px] text-mouau-gold font-semibold">
              Michael Okpara University
            </div>
          </div>
          <p className="font-serif italic text-[18px] leading-[1.6] opacity-90">
            "Knowledge for Service, Innovation for Excellence."
          </p>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 p-6 rounded-lg border border-white/20">
            <div className="flex justify-between mb-2 text-[13px]">
              <span>Active Courses</span>
              <strong className="font-bold">1,284</strong>
            </div>
            <div className="flex justify-between mb-2 text-[13px]">
              <span>Verified Lecturers</span>
              <strong className="font-bold">420</strong>
            </div>
            <div className="flex justify-between text-[13px]">
              <span>Total Resources</span>
              <strong className="font-bold">15.4 GB</strong>
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-transparent via-transparent to-white/5 pointer-events-none" />
      </div>

      {/* Right Auth Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-[100px] py-20 relative">
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="max-w-[500px] w-full mx-auto"
        >
          <header className="mb-10">
            <h1 className="font-serif text-[40px] text-mouau-green mb-2">Create Account</h1>
            <p className="text-[#666666] text-[16px]">Join the Courseware Management System</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold border border-red-100 italic">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-[#666666] uppercase tracking-wider block">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. John Doe"
                className="w-full px-4 py-3.5 border-[1.5px] border-[#e0e0e0] rounded-[4px] text-[16px] outline-none focus:border-mouau-green"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-[#666666] uppercase tracking-wider block">University Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mouau.edu.ng"
                className="w-full px-4 py-3.5 border-[1.5px] border-[#e0e0e0] rounded-[4px] text-[16px] outline-none focus:border-mouau-green"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#666666] uppercase tracking-wider block">Portal Role</label>
                <select
                  value={role || 'student'}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-4 py-3.5 border-[1.5px] border-[#e0e0e0] rounded-[4px] text-[16px] outline-none focus:border-mouau-green bg-white"
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
              </div>

              {role === 'student' && (
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#666666] uppercase tracking-wider block">Student Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-4 py-3.5 border-[1.5px] border-[#e0e0e0] rounded-[4px] text-[16px] outline-none focus:border-mouau-green bg-white"
                  >
                    {['100L', '200L', '300L', '400L'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <PasswordInput
                  label="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-mouau-green text-white py-4 rounded-[4px] font-semibold text-[16px] hover:bg-[#00522b] transition-all shadow-lg shadow-mouau-green/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Registering...' : 'Register for Portal'}
            </button>
          </form>

          <div className="mt-8 text-center text-[14px] text-[#666666]">
            Already have an account?{' '}
            <Link to="/login" className="text-mouau-green font-bold hover:underline">
              Sign In
            </Link>
          </div>

          <div className="absolute bottom-5 right-5 font-mono text-[10px] text-[#ccc] bg-[#f5f5f5] px-2 py-1 border border-[#eee] rounded">
            Build: v1.0.4 | Chunks: 12 | Suspense: Active
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
