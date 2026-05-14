import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Heart } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { HomeConfig } from '../types';

import { CHURCH_NAME, CHURCH_SHORT_NAME, DISTRICT, ASSEMBLY, CHURCH_LOGO } from '../constants';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [heroUrl, setHeroUrl] = useState('https://images.unsplash.com/photo-1510451885245-1987b59cc5b1?w=1400&q=80');
  const [logoUrl, setLogoUrl] = useState(CHURCH_LOGO);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'homeConfig'), (d) => {
      if (d.exists()) {
        const data = d.data() as HomeConfig;
        if (data.heroUrl) setHeroUrl(data.heroUrl);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      }
    });
    return unsub;
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-tac-blue-dark via-tac-blue to-tac-red-dark">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroUrl} 
          alt="Church" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-tac-blue-dark via-transparent to-transparent opacity-80" />
      </div>

      {/* Decorative Circles */}
      <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-tac-red/20 blur-3xl" />

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-lg px-8 text-center"
      >
        <div className="mb-8 overflow-hidden rounded-[2rem] border-2 border-white/20 p-2 mx-auto w-32 h-32 shadow-2xl bg-white">
          <img 
            src={logoUrl} 
            alt="TAC Logo" 
            className="w-full h-full object-contain rounded-[1.8rem]"
          />
        </div>

        <h1 className="font-serif text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tighter">
          {CHURCH_NAME}
        </h1>
        
        <p className="text-white/70 text-sm font-bold uppercase tracking-[0.2em] mb-2">
          {DISTRICT}
        </p>
        <p className="text-white/50 text-base leading-relaxed mb-8">
          {ASSEMBLY} · Greater Accra
        </p>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => navigate('/register')}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-tac-red hover:bg-tac-red-dark text-white rounded-2xl font-bold transition-all shadow-xl shadow-tac-red/30 active:scale-95"
          >
            <UserPlus size={20} />
            Create Account
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold transition-all backdrop-blur-md active:scale-95"
          >
            <LogIn size={20} />
            Sign In
          </button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-white/40 text-xs font-medium uppercase tracking-widest bg-black/20 py-3 rounded-full border border-white/5">
          <Heart size={14} className="text-tac-red" />
          <span>TAC Official Theme</span>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="absolute bottom-8 z-10 text-center text-white/30 text-[10px] uppercase tracking-widest leading-loose">
        © {new Date().getFullYear()} Powered by PLUTO-TECH <br />
        All Rights Reserved
      </footer>
    </div>
  );
};

export default Landing;
