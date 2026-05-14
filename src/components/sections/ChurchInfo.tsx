import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Info, MapPin, Phone, Mail, CreditCard, Landmark, Send, Copy, CheckCircle2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { HomeConfig } from '../../types';

const ChurchInfo: React.FC = () => {
  const [config, setConfig] = useState<HomeConfig | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'homeConfig'), (d) => {
      if (d.exists()) setConfig(d.data() as HomeConfig);
    });
    return unsub;
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!config) return null;

  const info = config.churchInfo;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8 pb-20">
      <header className="text-center space-y-4">
        <div className="w-16 h-16 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue rounded-3xl flex items-center justify-center mx-auto mb-6">
           <Info size={32} />
        </div>
        <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white">Assembly Information</h2>
        <p className="text-[var(--Sub)] font-medium">Contact, Location and Official Financial Accounts of the Assembly.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location & Contact */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Contact Details</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
               <div className="w-12 h-12 bg-tac-red/5 dark:bg-tac-red/20 text-tac-red rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin size={24} />
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Physical Location</p>
                  <p className="text-sm font-bold text-tac-blue-dark dark:text-white leading-relaxed">{info?.location || 'Location details not set.'}</p>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="w-12 h-12 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue rounded-2xl flex items-center justify-center shrink-0">
                  <Mail size={24} />
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email Support</p>
                  <p className="text-sm font-bold text-tac-blue-dark dark:text-white">{info?.contactEmail || 'contact@ apostolicchurchgh.org'}</p>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="w-12 h-12 bg-tac-gold/5 dark:bg-tac-gold/20 text-tac-gold rounded-2xl flex items-center justify-center shrink-0">
                  <Phone size={24} />
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Phone / Assistance</p>
                  <p className="text-sm font-bold text-tac-blue-dark dark:text-white">{info?.contactPhone || 'Contact number not set.'}</p>
               </div>
            </div>
          </div>
        </motion.section>

        {/* Bank & Payment */}
        <div className="space-y-6">
          {info?.bankDetails?.length ? (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3">
                 <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Bank Accounts</h3>
              </div>
              <div className="space-y-4">
                 {info.bankDetails.map((bank, i) => (
                   <div key={i} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 flex items-center justify-between group transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-md">
                      <div>
                         <p className="text-[10px] font-black uppercase text-tac-blue tracking-widest mb-1">{bank.bankName}</p>
                         <p className="text-sm font-black text-tac-blue-dark dark:text-white mb-1">{bank.accountNumber}</p>
                         <p className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">{bank.accountName}</p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(bank.accountNumber, `bank-${i}`)}
                        className={`p-2 rounded-xl transition-all ${copiedIndex === `bank-${i}` ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-700 text-gray-400 dark:text-white/60 border border-gray-100 dark:border-white/10 hover:text-tac-blue'}`}
                      >
                         {copiedIndex === `bank-${i}` ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                      </button>
                   </div>
                 ))}
              </div>
            </motion.section>
          ) : null}

          {info?.transferAccounts?.length ? (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3">
                 <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Transfer Accounts</h3>
              </div>
              <div className="space-y-4">
                 {info.transferAccounts.map((acc, i) => (
                   <div key={i} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 flex items-center justify-between group transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-md">
                      <div>
                         <p className="text-[10px] font-black uppercase text-tac-red tracking-widest mb-1">{acc.provider}</p>
                         <p className="text-sm font-black text-tac-blue-dark dark:text-white">{acc.details}</p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(acc.details, `acc-${i}`)}
                        className={`p-2 rounded-xl transition-all ${copiedIndex === `acc-${i}` ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-700 text-gray-400 dark:text-white/60 border border-gray-100 dark:border-white/10 hover:text-tac-red'}`}
                      >
                         {copiedIndex === `acc-${i}` ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                      </button>
                   </div>
                 ))}
              </div>
            </motion.section>
          ) : null}
        </div>
      </div>

      <div className="bg-tac-blue-dark text-white rounded-[3rem] p-12 text-center space-y-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
            <Send size={160} />
         </div>
         <h3 className="text-2xl font-serif font-black italic">Financial Stewardship</h3>
         <p className="text-tac-blue/40 text-sm max-w-lg mx-auto font-medium">When you give to the church, you empower the spread of the Gospel and the support of our local and global fellowship. God bless you.</p>
         <div className="pt-4 flex justify-center gap-4">
            <span className="px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">Direct Bank</span>
            <span className="px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">Mobile MoMo</span>
            <span className="px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">Pay ID</span>
         </div>
      </div>
    </div>
  );
};

export default ChurchInfo;
