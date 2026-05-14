import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, CreditCard, Landmark, Smartphone, History, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GiveView: React.FC = () => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('offering');
  const [step, setStep] = useState(1);

  const giveTypes = [
    { id: 'offering', label: 'General Offering', icon: <Heart size={20} />, color: 'bg-tac-blue' },
    { id: 'tithe', label: 'Tithe (10%)', icon: <Landmark size={20} />, color: 'bg-tac-red' },
    { id: 'welfare', label: 'Welfare Fund', icon: <History size={20} />, color: 'bg-orange-500' },
    { id: 'mission', label: 'Mission Seed', icon: <CreditCard size={20} />, color: 'bg-green-500' },
  ];

  const handleNext = () => setStep(2);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white">Giving & Tithe</h2>
        <p className="text-[var(--Sub)] font-medium">Supporting the work of God in {profile?.name.split(' ')[0]}'s assembly.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-8 space-y-8 dark:bg-slate-900 border border-[var(--Bdr)]">
            {step === 1 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-tac-blue/40 dark:text-white/40 tracking-[0.2em]">Select Payment Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    {giveTypes.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${type === t.id ? 'border-tac-blue bg-tac-blue/5 dark:bg-tac-blue/20' : 'border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${t.color}`}>
                          {t.icon}
                        </div>
                        <span className={`font-black text-sm ${type === t.id ? 'text-tac-blue-dark dark:text-white' : 'text-[var(--Sub)]'}`}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-tac-blue/40 dark:text-white/40 tracking-[0.2em]">Enter Amount (GHS)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-tac-blue-dark/20 dark:text-white/20">₵</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full text-4xl font-black font-serif p-6 pl-14 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] outline-none focus:ring-4 focus:ring-tac-blue/5 focus:bg-white dark:focus:bg-slate-800 transition-all text-tac-blue-dark dark:text-white"
                    />
                  </div>
                </div>

                <button 
                  disabled={!amount || parseFloat(amount) <= 0}
                  onClick={handleNext}
                  className="w-full h-16 bg-tac-blue text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-tac-blue/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  Proceed to Pay <ArrowRight size={20} />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-10"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={40} />
                </div>
                <h3 className="text-2xl font-black text-tac-blue-dark dark:text-white">Mobile Money Integration</h3>
                <p className="text-[var(--Sub)] max-w-xs mx-auto">This would trigger a Mobile Money prompt for GHS {amount} on your registered phone.</p>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                  Payment Gateway Integration Pending
                </div>
                <button onClick={() => setStep(1)} className="text-tac-blue dark:text-tac-blue-light font-bold text-sm hover:underline">Back to Selection</button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="card p-6 bg-tac-blue-dark text-white space-y-4 shadow-xl">
              <h4 className="text-sm font-black uppercase tracking-widest text-white/40">Why we give?</h4>
              <p className="text-xs leading-relaxed opacity-60">"Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." - 2 Cor 9:7</p>
           </div>

           <div className="card p-6 bg-white dark:bg-slate-900 border border-[var(--Bdr)] space-y-4">
              <h4 className="text-sm font-black text-tac-blue-dark dark:text-white flex items-center gap-2">
                 <History size={16} className="text-tac-blue" /> Recent Giving
              </h4>
              <div className="space-y-3">
                 <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/5">
                    <div>
                       <p className="text-xs font-black text-tac-blue-dark dark:text-white uppercase">Offering</p>
                       <p className="text-[10px] text-[var(--Sub)] font-bold">May 10, 2024</p>
                    </div>
                    <span className="font-black text-tac-blue dark:text-tac-blue-light text-sm">₵ 50.00</span>
                 </div>
                 <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/5 opacity-40">
                    <p className="text-[10px] italic dark:text-white/60">No other recent history found</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GiveView;
