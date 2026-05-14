import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  ChevronRight, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  CheckCircle2, 
  ShieldCheck,
  Users,
  Shield
} from 'lucide-react';
import { CHURCH_LOGO, CHURCH_SHORT_NAME } from '../constants';
import { auth, db } from '../firebase';
import { UserRole } from '../types';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, profile, refreshProfile } = useAuth();
  const isLogin = location.pathname === '/login';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'member' as UserRole,
    adminCode: ''
  });

  const handleRegisterNext = () => {
    if (!formData.firstName || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleRegisterSubmit = async () => {
    if (formData.role === 'admin' && formData.adminCode !== '1234') {
      setError('Invalid Admin access code.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        color: randomColor,
        joinedDate: new Date().toISOString(),
        online: true,
        createdAt: serverTimestamp()
      });
      
      await refreshProfile();
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet or try opening this app in a new tab (AI Studio constraints).');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Sign-in method NOT enabled. Go to Firebase Console > Authentication and enable Email/Password.");
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please keep the popup window open to sign in.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error: If on mobile/preview, try opening in a new tab.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google Sign-In is not enabled in Firebase Console.");
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--Bg)] overflow-hidden">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-tac-blue-dark to-tac-blue pt-12 pb-6 px-6 text-center overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-3 shadow-lg overflow-hidden flex items-center justify-center border-2 border-white/20 p-2">
             <img src={CHURCH_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="font-serif text-2xl font-black text-white">
            {isLogin ? 'Welcome Back 🙏' : 'Join Our Portal'}
          </h2>
          <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-bold">
            {CHURCH_SHORT_NAME}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 pb-20">
        {authUser && !profile ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
             <div className="w-16 h-16 border-4 border-tac-blue/20 border-t-tac-blue rounded-full animate-spin" />
             <div>
               <h3 className="text-xl font-black text-tac-blue-dark">Finalizing Profile...</h3>
               <p className="text-sm text-[var(--Sub)]">Please wait while we set up your church portal.</p>
             </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-sm mx-auto"
            >
              <div className="space-y-1 mb-8">
                <h3 className="text-2xl font-black font-serif text-tac-blue-dark">Sign In</h3>
                <p className="text-sm text-[var(--Sub)]">Access your global church dashboard</p>
              </div>

              <div className="space-y-4">
                <FormInput 
                  label="Email Address" 
                  icon={<Mail size={18} />} 
                  type="email" 
                  value={formData.email}
                  onChange={(v) => setFormData({...formData, email: v})} 
                />
                <FormInput 
                  label="Password" 
                  icon={<Lock size={18} />} 
                  type="password" 
                  value={formData.password}
                  onChange={(v) => setFormData({...formData, password: v})} 
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-3 rounded-xl flex items-start gap-2">
                  <Shield size={16} className="text-tac-red shrink-0 mt-0.5" />
                  <p className="text-tac-red dark:text-red-400 text-xs font-bold leading-relaxed text-left">
                    {error.includes('auth/popup-closed-by-user') 
                      ? "Sign-in cancelled. On mobile, please ensure you don't close the Google popup. If issues persist, try opening the site in your browser directly (not inside another app)."
                      : error}
                  </p>
                </div>
              )}

              <button 
                onClick={handleLoginSubmit}
                disabled={loading}
                className="w-full btn-primary h-14 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In →'}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--Bg)] px-2 text-[var(--Sub)] font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-14 bg-white border border-[var(--Bdr)] rounded-2xl flex items-center justify-center gap-3 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                {loading ? 'Connecting...' : 'Sign in with Google'}
              </button>

              <div className="text-center pt-4">
                <p className="text-sm text-[var(--Sub)]">
                  New to TAC? <button onClick={() => navigate('/register')} className="text-tac-blue font-bold">Create Account</button>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-sm mx-auto"
            >
              <StepIndicator current={step} />

              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="First Name" value={formData.firstName} onChange={(v) => setFormData({...formData, firstName: v})} />
                    <FormInput label="Last Name" value={formData.lastName} onChange={(v) => setFormData({...formData, lastName: v})} />
                  </div>
                  <FormInput label="Email Address" icon={<Mail size={18} />} type="email" value={formData.email} onChange={(v) => setFormData({...formData, email: v})} />
                  <FormInput label="Phone Number" icon={<Phone size={18} />} type="tel" value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} />
                  <FormInput label="Password" icon={<Lock size={18} />} type="password" value={formData.password} onChange={(v) => setFormData({...formData, password: v})} />
                  <FormInput label="Confirm Password" icon={<ShieldCheck size={18} />} type="password" value={formData.confirmPassword} onChange={(v) => setFormData({...formData, confirmPassword: v})} />
                  
                  {error && <p className="text-tac-red text-xs font-bold">{error}</p>}
                  
                  <button onClick={handleRegisterNext} className="w-full btn-primary h-14">Continue <ChevronRight size={18} className="inline ml-1" /></button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[var(--Bg)] px-2 text-[var(--Sub)] font-bold tracking-widest">Or join with</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full h-14 bg-white border border-[var(--Bdr)] rounded-2xl flex items-center justify-center gap-3 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    {loading ? 'Connecting...' : 'Sign up with Google'}
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-[var(--Sub)]">
                      Already have an account? <button onClick={() => navigate('/login')} className="text-tac-blue font-bold">Sign In</button>
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-xl font-black font-serif text-tac-blue-dark">Choose Your Role</h3>
                  <div className="space-y-3">
                    <RoleCard 
                      selected={formData.role === 'member'} 
                      icon={<Users size={24} />} 
                      title="Member" 
                      desc="Join for sermons, events & church chat" 
                      onClick={() => setFormData({...formData, role: 'member'})} 
                    />
                    <RoleCard 
                      selected={formData.role === 'presbytery'} 
                      icon={<ShieldCheck size={24} className="text-tac-blue" />} 
                      title="Presbytery" 
                      desc="Authority to submit content for review" 
                      onClick={() => setFormData({...formData, role: 'presbytery'})} 
                    />
                    <RoleCard 
                      selected={formData.role === 'admin'} 
                      icon={<ShieldCheck size={24} className="text-green-600" />} 
                      title="Admin" 
                      desc="Full management & publishing controls" 
                      onClick={() => setFormData({...formData, role: 'admin'})} 
                    />
                  </div>

                  {formData.role === 'admin' && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                      <FormInput border label="Admin Authorization Code" type="password" placeholder="Enter secret code" value={formData.adminCode} onChange={(v) => setFormData({...formData, adminCode: v})} />
                    </div>
                  )}

                  {error && <p className="text-tac-red text-xs font-bold">{error}</p>}
                  
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 border border-[var(--Bdr)] rounded-2xl font-bold text-[var(--Sub)]">Back</button>
                    <button onClick={handleRegisterSubmit} disabled={loading} className="flex-[2] btn-primary h-14">
                      {loading ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-6 py-8 animate-in scale-in duration-500">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-serif text-tac-blue-dark">Welcome to TAC!</h3>
                    <p className="text-sm text-[var(--Sub)] px-4">Your membership account has been created successfully.</p>
                  </div>
                  <button onClick={() => navigate('/login')} className="w-full btn-primary h-14 shadow-green-200">Sign In Now →</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      <footer className="p-6 text-center border-t border-[var(--Bdr)] bg-white/50 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="flex items-center justify-center gap-2 mx-auto text-sm text-[var(--Sub)] font-medium">
          <ArrowLeft size={16} /> Back to Welcome
        </button>
      </footer>
    </div>
  );
};

const FormInput: React.FC<{ label: string; icon?: React.ReactNode; type?: string; placeholder?: string; value: string; onChange: (v: string) => void; border?: boolean }> = ({ label, icon, type = 'text', placeholder, value, onChange, border }) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black uppercase tracking-widest text-tac-blue-dark/50 ml-1">{label}</label>
    <div className={`relative flex items-center bg-white rounded-2xl transition-all focus-within:ring-2 focus-within:ring-tac-blue/10 ${border ? 'border-2 border-tac-blue/10' : 'shadow-sm border border-[var(--Bdr)]'}`}>
      {icon && <div className="pl-4 text-[var(--Sub)]">{icon}</div>}
      <input 
        type={type} 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent px-4 py-3.5 text-sm font-medium outline-none placeholder:text-gray-300"
      />
    </div>
  </div>
);

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center justify-center gap-4 mb-8">
    {[1, 2, '✓'].map((s, i) => (
      <React.Fragment key={i}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${current > i + 1 ? 'bg-green-500 text-white' : current === i + 1 ? 'bg-tac-blue text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
          {s}
        </div>
        {i < 2 && <div className={`h-1 flex-1 rounded-full transition-all ${current > i + 1 ? 'bg-green-500' : 'bg-gray-100'}`} />}
      </React.Fragment>
    ))}
  </div>
);

const RoleCard: React.FC<{ selected: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ selected, icon, title, desc, onClick }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`w-full flex items-start gap-4 p-4 rounded-2xl text-left border-2 transition-all ${selected ? 'border-tac-blue bg-tac-blue/5 shadow-md shadow-tac-blue/5' : 'border-[var(--Bdr)] bg-white hover:border-tac-blue/30'}`}
  >
    <div className={`p-3 rounded-xl ${selected ? 'bg-tac-blue text-white shadow-lg' : 'bg-gray-50 text-[var(--Sub)]'}`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className={`text-sm font-black ${selected ? 'text-tac-blue-dark' : 'text-gray-700'}`}>{title}</div>
      <p className="text-[11px] text-[var(--Sub)] leading-relaxed mt-0.5">{desc}</p>
    </div>
    {selected && <CheckCircle2 size={20} className="text-tac-blue shrink-0 mt-1" />}
  </button>
);

export default Auth;
