import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      // Determine navigation dynamically based on the fetched user role
      if (user.role === 'lecturer') {
        navigate('/lecturer-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err: any) {
      const errorMsg = err.message || err.code;
      alert(`Sign-In Failed: ${errorMsg}`); // Mobile/Vercel debugging requirement
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(`An error occurred during login: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="animate-spin text-[#006837] mb-4">
          <ShieldCheck size={64} />
        </div>
        <p className="text-[#006837] font-serif font-bold text-xl animate-pulse">MOUAU Portal Loading...</p>
        <p className="text-gray-400 text-sm mt-2">Authenticating academic credentials...</p>
      </div>
    );
  }

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
              <span>Portal Status</span>
              <strong className="font-bold">Operational</strong>
            </div>
            <div className="flex justify-between mb-2 text-[13px]">
              <span>System Time</span>
              <strong className="font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
            <div className="flex justify-between text-[13px]">
              <span>Network</span>
              <strong className="font-bold">Secured</strong>
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-transparent via-transparent to-white/5 pointer-events-none" />
      </div>

      {/* Right Auth Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-[100px] py-20 relative">
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="max-w-[450px] w-full mx-auto"
        >
          <header className="mb-10 text-center sm:text-left">
            <h1 className="font-serif text-[40px] text-mouau-green mb-2">Sign In</h1>
            <p className="text-[#666666] text-[16px]">Access your Courseware Dashboard</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold border border-red-100 italic">
                {error}
              </div>
            )}
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

            <PasswordInput
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-mouau-green text-white py-4 rounded-[4px] font-semibold text-[16px] hover:bg-[#00522b] transition-all shadow-lg shadow-mouau-green/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-8 text-center text-[14px] text-[#666666]">
            Don't have an account?{' '}
            <Link to="/register" className="text-mouau-green font-bold hover:underline">
              Register now
            </Link>
          </div>

          <div className="absolute bottom-5 right-5 font-mono text-[10px] text-[#ccc] bg-[#f5f5f5] px-2 py-1 border border-[#eee] rounded">
            Build: v1.0.4 | Secure Vault: Active
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
