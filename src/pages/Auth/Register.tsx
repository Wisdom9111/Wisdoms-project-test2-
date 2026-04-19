import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, ShieldCheck, X, Loader2, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';
import { Role } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

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

  // Email Existence Checking
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailExists(false);
      return;
    }
    
    let isMounted = true;
    const checkEmail = async () => {
      setCheckingEmail(true);
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (isMounted) {
          setEmailExists(methods.length > 0);
        }
      } catch (err: any) {
        console.error("Error checking email", err);
        if (isMounted) setEmailExists(false);
      } finally {
        if (isMounted) setCheckingEmail(false);
      }
    };

    const timeoutId = setTimeout(checkEmail, 600);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [email]);

  // Verification UI State
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const generateAndSendCode = async (userEmail: string) => {
    setIsSendingCode(true);
    setVerificationError(null);
    try {
      const code = "MOUAU_CMP_" + Math.floor(100000 + Math.random() * 900000);
      setGeneratedCode(code);
      
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, code })
      });

      if (!res.ok) {
        throw new Error('Failed to send verification email. Please check your email address or try again later.');
      }
      
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to trigger code generation.");
      setShowVerificationModal(false);
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailExists) {
      return; // Do nothing if email exists
    }
    if (password.length < 6) {
      setError("Password is too weak. Use at least 6 characters.");
      return;
    }
    setError(null);
    setShowVerificationModal(true);
    await generateAndSendCode(email);
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Verification checking
    if (userEnteredCode !== generatedCode) {
      setVerificationError("The code is incorrect. Please check your email and try again.");
      return;
    }

    // Pass verification
    setVerificationError(null);
    setLoading(true);
    
    try {
      await register(email, password, name, role, role === 'student' ? level : undefined);
      // Wait a moment for auth state to fully establish before forwarding
      setTimeout(() => {
        if (role === 'lecturer') {
          navigate('/lecturer-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      }, 500);
    } catch (err: any) {
      setShowVerificationModal(false); // Drop modal to show error
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Try logging in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Registration failed. Please try again later.");
      }
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

          <form onSubmit={handleInitialSubmit} className="space-y-6">
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

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-[#666666] uppercase tracking-wider block">University Email</label>
                {checkingEmail && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mouau.edu.ng"
                className={`w-full px-4 py-3.5 border-[1.5px] rounded-[4px] text-[16px] outline-none transition-colors ${
                  emailExists ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-[#e0e0e0] focus:border-mouau-green'
                }`}
              />
              {emailExists && (
                <p className="text-red-500 text-sm font-medium mt-1">
                  This email is already registered. Try logging in.
                </p>
              )}
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
              disabled={loading || emailExists || checkingEmail}
              className={`w-full bg-mouau-green text-white py-4 rounded-[4px] font-semibold text-[16px] transition-all shadow-lg shadow-mouau-green/20 
                ${(loading || emailExists || checkingEmail) 
                  ? 'opacity-40 cursor-not-allowed bg-gray-500 hover:bg-gray-500 shadow-none' 
                  : 'hover:bg-[#00522b]'
                }`}
            >
              Request Verification Code
            </button>
          </form>

          <div className="mt-8 text-center text-[14px] text-[#666666]">
            Already have an account?{' '}
            <Link to="/login" className="text-mouau-green font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Verification Modal Popup */}
      <AnimatePresence>
        {showVerificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-mouau-green to-[#00522b] px-6 py-4 flex items-center justify-between text-white">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <ShieldCheck size={20} />
                  Email Verification
                </h2>
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-mouau-green/10 text-mouau-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} />
                  </div>
                  <p className="text-gray-800 font-medium text-lg mb-1">
                    Check your inbox or spam for the code
                  </p>
                  <p className="text-sm text-gray-500">
                    We sent a strict 6-digit verification code to <strong>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  {verificationError && (
                    <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded text-center border border-red-100">
                      {verificationError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest text-center block">
                      Enter MOUAU_CMP_ Code
                    </label>
                    <input
                      type="text"
                      required
                      value={userEnteredCode}
                      onChange={(e) => setUserEnteredCode(e.target.value.toUpperCase())}
                      placeholder="MOUAU_CMP_123456"
                      className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg text-center text-lg font-mono tracking-widest outline-none focus:border-mouau-green focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isSendingCode}
                    className="w-full bg-mouau-green text-white py-3.5 rounded-lg font-bold hover:bg-[#00522b] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Complete Registration'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => generateAndSendCode(email)}
                    disabled={isSendingCode}
                    className="text-sm text-gray-500 hover:text-mouau-green transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                  >
                    {isSendingCode ? <Loader2 className="animate-spin shrink-0" size={14} /> : <Send size={14} />}
                    <span className="font-medium underline decoration-dashed underline-offset-4">
                      {isSendingCode ? 'Sending...' : "Didn't receive code? Resend"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;

