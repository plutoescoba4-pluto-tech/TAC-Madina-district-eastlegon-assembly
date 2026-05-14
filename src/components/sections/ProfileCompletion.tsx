import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Briefcase, Calendar, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile } from '../../types';

interface ProfileCompletionProps {
  profile: UserProfile;
  onComplete: () => void;
}

const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ profile, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    userId: profile.userId || '',
    phone: profile.phone || '',
    occupation: profile.occupation || '',
    dateOfBirth: profile.dateOfBirth || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.phone || !formData.occupation || !formData.dateOfBirth) {
      setError('All fields are mandatory to proceed.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Use setDoc with merge to handle cases where the document doesn't exist yet
      const { uid, ...profileWithoutUid } = profile;
      await setDoc(doc(db, 'users', uid), {
        ...profileWithoutUid,
        ...formData,
        isProfileComplete: true,
      }, { merge: true });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-tac-blue-dark flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="bg-tac-blue p-8 text-white text-center relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <div className="w-20 h-20 bg-white/10 rounded-3xl mx-auto mb-4 flex items-center justify-center backdrop-blur-md shadow-xl border border-white/20">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black font-serif">Secure Your Profile</h2>
          <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-bold">The Apostolic Church Ghana</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-tac-blue-dark/50 dark:text-white/40 ml-1">Church Member ID</label>
               <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-tac-blue/10 transition-all">
                  <div className="pl-4 text-tac-blue-dark/40"><User size={18} /></div>
                  <input 
                    required
                    placeholder="Enter ID (e.g. TAC-1234)"
                    className="w-full bg-transparent px-4 py-4 text-sm font-bold outline-none dark:text-white"
                    value={formData.userId}
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                  />
               </div>
             </div>

             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-tac-blue-dark/50 dark:text-white/40 ml-1">Mobile Contact</label>
               <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-tac-blue/10 transition-all">
                  <div className="pl-4 text-tac-blue-dark/40"><Phone size={18} /></div>
                  <input 
                    required
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full bg-transparent px-4 py-4 text-sm font-bold outline-none dark:text-white"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-tac-blue-dark/50 dark:text-white/40 ml-1">Occupation</label>
                 <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-tac-blue/10 transition-all">
                    <div className="pl-4 text-tac-blue-dark/40"><Briefcase size={16} /></div>
                    <input 
                      required
                      placeholder="e.g. Student"
                      className="w-full bg-transparent px-4 py-4 text-sm font-bold outline-none dark:text-white"
                      value={formData.occupation}
                      onChange={e => setFormData({...formData, occupation: e.target.value})}
                    />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-tac-blue-dark/50 dark:text-white/40 ml-1">Date of Birth</label>
                 <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-tac-blue/10 transition-all">
                    <div className="pl-4 text-tac-blue-dark/40"><Calendar size={16} /></div>
                    <input 
                      required
                      type="date"
                      className="w-full bg-transparent px-4 py-4 text-sm font-bold outline-none dark:text-white"
                      value={formData.dateOfBirth}
                      onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                    />
                 </div>
               </div>
             </div>
          </div>

          {error && <p className="text-tac-red text-[11px] font-black italic text-center px-2">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-tac-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-tac-blue/20 hover:shadow-22l transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={20} /> Access Portal</>}
          </button>

          <p className="text-[10px] text-gray-400 text-center px-6 leading-relaxed">
            By completing your profile, you help us keep our assembly data accurate and secure.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileCompletion;
