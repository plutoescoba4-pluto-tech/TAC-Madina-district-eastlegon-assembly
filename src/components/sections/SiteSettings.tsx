import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Globe, Info, Clock, CheckCircle2, Layout, Megaphone, X, Plus, Trash2, Camera, User, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { HomeConfig } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const SiteSettings: React.FC = () => {
  const { profile } = useAuth();
  const [config, setConfig] = useState<HomeConfig>({
    id: 'main',
    theme: '',
    motto: '',
    services: [],
    announcement: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'homeConfig'), (d) => {
      if (d.exists()) {
        setConfig( d.data() as HomeConfig);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/homeConfig');
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'homeConfig'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/homeConfig');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (type: 'logo' | 'hero' | 'slides', index?: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (type === 'logo') setConfig(c => ({ ...c, logoUrl: result }));
          if (type === 'hero') setConfig(c => ({ ...c, heroUrl: result }));
          if (type === 'slides' && index !== undefined) {
             const updated = [...(config.heroSlides || [])];
             updated[index] = result;
             setConfig(c => ({ ...c, heroSlides: updated }));
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-tac-blue/10 border-t-tac-blue rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white">Assembly Administration</h2>
        <p className="text-[var(--Sub)] font-medium">Managing every aspect of the {profile?.role === 'admin' ? 'global' : 'local'} operational needs.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
         {/* Identity Section */}
         <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue rounded-xl flex items-center justify-center">
                  <Layout size={20} />
               </div>
               <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Dashboard Appearance</h3>
            </div>

             <div className="grid grid-cols-1 gap-6">
               <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Primary Church Logo</label>
                      <div className="flex items-center gap-4">
                         <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center p-2 shadow-inner overflow-hidden">
                            <img src={config.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/antigravity-9999.appspot.com/o/applet_assets%2Fchurch_logo.png?alt=media'} alt="Logo Preview" className="w-full h-full object-contain" />
                         </div>
                         <button 
                           type="button"
                           onClick={() => handleFileUpload('logo')}
                           className="px-4 py-2 bg-tac-blue text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-tac-blue/20"
                         >
                           Upload Logo
                         </button>
                      </div>
                    </div>

                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Hero Backdrop</label>
                      <div className="flex items-center gap-4">
                         <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner p-1">
                            {config.heroUrl ? <img src={config.heroUrl} className="w-full h-full object-cover rounded-xl" /> : <ImageIcon className="text-gray-200" />}
                         </div>
                         <button 
                           type="button"
                           onClick={() => handleFileUpload('hero')}
                           className="px-4 py-2 bg-tac-red text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-tac-red/20"
                         >
                           Upload Backdrop
                         </button>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Hero Slideshow (Direct Upload)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(config.heroSlides || []).map((slide, idx) => (
                      <div key={idx} className="relative aspect-video bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden group">
                        <img src={slide} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <button 
                             type="button"
                             onClick={() => handleFileUpload('slides', idx)}
                             className="p-2 bg-white text-tac-blue rounded-full hover:scale-110 active:scale-95 transition-all"
                           >
                             <RotateCcw size={16} />
                           </button>
                           <button 
                             type="button"
                             onClick={() => setConfig({...config, heroSlides: (config.heroSlides || []).filter((_, i) => i !== idx)})}
                             className="p-2 bg-white text-tac-red rounded-full hover:scale-110 active:scale-95 transition-all"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setConfig({...config, heroSlides: [...(config.heroSlides || []), 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80']})}
                      className="aspect-video border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-white/40 hover:border-tac-blue hover:text-tac-blue transition-all group"
                    >
                      <Plus size={24} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Add Slide</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 italic px-1 pt-2">Upload images directly to cycle on the homepage banner.</p>
               </div>
               <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Global Assembly Theme</label>
                  <textarea 
                    value={config.theme}
                    onChange={e => setConfig({...config, theme: e.target.value})}
                    rows={4}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6 outline-none focus:border-tac-blue/30 text-lg font-serif font-black text-tac-blue-dark dark:text-white leading-tight"
                    placeholder="Enter the power theme e.g. The Power of Unwavering Faith..."
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Church Motto / Verse</label>
                  <input 
                    type="text"
                    value={config.motto}
                    onChange={e => setConfig({...config, motto: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 h-16 outline-none focus:border-tac-blue/30 text-tac-blue-dark dark:text-white font-medium italic"
                    placeholder="e.g. John 3:16"
                  />
               </div>
            </div>
         </section>

         {/* Announcements Section */}
         <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-tac-red/5 dark:bg-tac-red/20 text-tac-red rounded-xl flex items-center justify-center">
                  <Megaphone size={20} />
               </div>
               <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Dashboard Announcement</h3>
            </div>
            
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Top Bar Broadcast Message</label>
               <input 
                  type="text"
                  value={config.announcement || ''}
                  onChange={e => setConfig({...config, announcement: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 h-16 outline-none focus:border-tac-blue/30 text-sm font-bold text-tac-blue-dark dark:text-white"
                  placeholder="e.g. Special Revival Meeting tonight at 6:30 PM!"
               />
               <p className="text-[9px] text-gray-400 italic px-1">This message will appear prominently on every member's dashboard.</p>
            </div>
         </section>

         {/* Service Times Section */}
         <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-tac-gold/5 dark:bg-tac-gold/20 text-tac-gold rounded-xl flex items-center justify-center">
                  <Clock size={20} />
               </div>
               <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Standard Service Times</h3>
            </div>

            <div className="space-y-4">
               {config.services.map((s, idx) => (
                 <div key={s.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                    <input 
                      type="text"
                      value={s.label}
                      onChange={e => {
                        const updated = [...config.services];
                        updated[idx].label = e.target.value;
                        setConfig({...config, services: updated});
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-black text-tac-blue-dark dark:text-white"
                      placeholder="Service Name"
                    />
                    <div className="w-[1px] bg-gray-200 dark:bg-white/10" />
                    <input 
                      type="text"
                      value={s.time}
                      onChange={e => {
                        const updated = [...config.services];
                        updated[idx].time = e.target.value;
                        setConfig({...config, services: updated});
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-[var(--Sub)] dark:text-white/60"
                      placeholder="Time (e.g. 7:00 AM)"
                    />
                    <button 
                      type="button"
                      onClick={() => setConfig({...config, services: config.services.filter((_, i) => i !== idx)})}
                      className="text-red-300 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                 </div>
               ))}
               <button 
                  type="button"
                  onClick={() => setConfig({...config, services: [...config.services, { id: Date.now().toString(), label: '', time: '' }]})}
                  className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:border-tac-blue hover:text-tac-blue transition-all"
               >
                  + Add Service Slot
               </button>
            </div>
         </section>

         {/* Church Info Section */}
         <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-[var(--Bdr)] shadow-sm space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue rounded-xl flex items-center justify-center">
                  <Info size={20} />
               </div>
               <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">Church Member Info & Accounts</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Location Address</label>
                 <textarea 
                   value={config.churchInfo?.location || ''}
                   onChange={e => setConfig({...config, churchInfo: { ...config.churchInfo, location: e.target.value }})}
                   rows={3}
                   className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 outline-none focus:border-tac-blue/30 text-xs font-bold text-tac-blue-dark dark:text-white"
                   placeholder="Physical address of the assembly"
                 />
               </div>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Account Contact Email</label>
                   <input 
                     type="email"
                     value={config.churchInfo?.contactEmail || ''}
                     onChange={e => setConfig({...config, churchInfo: { ...config.churchInfo, contactEmail: e.target.value }})}
                     className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 h-12 outline-none focus:border-tac-blue/30 text-xs font-bold text-tac-blue-dark dark:text-white"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Account Contact Phone</label>
                   <input 
                     type="tel"
                     value={config.churchInfo?.contactPhone || ''}
                     onChange={e => setConfig({...config, churchInfo: { ...config.churchInfo, contactPhone: e.target.value }})}
                     className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 h-12 outline-none focus:border-tac-blue/30 text-xs font-bold text-tac-blue-dark dark:text-white"
                   />
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Bank Payment Accounts</label>
                 <button 
                  type="button" 
                  onClick={() => setConfig({ ...config, churchInfo: { ...config.churchInfo, bankDetails: [...(config.churchInfo?.bankDetails || []), { bankName: '', accountName: '', accountNumber: '' }]}})}
                  className="text-[9px] font-black uppercase text-tac-blue flex items-center gap-1"
                 >
                   <Plus size={12} /> Add Bank
                 </button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(config.churchInfo?.bankDetails || []).map((bank, bidx) => (
                    <div key={bidx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3 relative group">
                       <button 
                        type="button"
                        onClick={() => {
                          const updated = [...(config.churchInfo?.bankDetails || [])];
                          updated.splice(bidx, 1);
                          setConfig({ ...config, churchInfo: { ...config.churchInfo, bankDetails: updated }});
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-tac-red p-1 hover:bg-tac-red/5 rounded-lg"
                       >
                         <Trash2 size={14} />
                       </button>
                       <input 
                         placeholder="Bank Name"
                         value={bank.bankName}
                         onChange={e => {
                           const updated = [...(config.churchInfo?.bankDetails || [])];
                           updated[bidx].bankName = e.target.value;
                           setConfig({ ...config, churchInfo: { ...config.churchInfo, bankDetails: updated }});
                         }}
                         className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 outline-none text-[11px] font-black text-tac-blue-dark dark:text-white pb-1 placeholder:text-gray-400"
                       />
                       <input 
                         placeholder="Account Name"
                         value={bank.accountName}
                         onChange={e => {
                           const updated = [...(config.churchInfo?.bankDetails || [])];
                           updated[bidx].accountName = e.target.value;
                           setConfig({ ...config, churchInfo: { ...config.churchInfo, bankDetails: updated }});
                         }}
                         className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 outline-none text-[10px] font-medium dark:text-white/60 placeholder:text-gray-400"
                       />
                       <input 
                         placeholder="Account Number"
                         value={bank.accountNumber}
                         onChange={e => {
                           const updated = [...(config.churchInfo?.bankDetails || [])];
                           updated[bidx].accountNumber = e.target.value;
                           setConfig({ ...config, churchInfo: { ...config.churchInfo, bankDetails: updated }});
                         }}
                         className="w-full bg-transparent border-none outline-none text-xs font-black tracking-widest text-tac-red placeholder:text-tac-red/50"
                       />
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Mobile Transfer / Others</label>
                 <button 
                  type="button" 
                  onClick={() => setConfig({ ...config, churchInfo: { ...config.churchInfo, transferAccounts: [...(config.churchInfo?.transferAccounts || []), { provider: '', details: '' }]}})}
                  className="text-[9px] font-black uppercase text-tac-blue flex items-center gap-1"
                 >
                   <Plus size={12} /> Add Account
                 </button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(config.churchInfo?.transferAccounts || []).map((acc, aidx) => (
                    <div key={aidx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 space-y-2 relative group">
                       <button 
                        type="button"
                        onClick={() => {
                          const updated = [...(config.churchInfo?.transferAccounts || [])];
                          updated.splice(aidx, 1);
                          setConfig({ ...config, churchInfo: { ...config.churchInfo, transferAccounts: updated }});
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-tac-red p-1 hover:bg-tac-red/5 rounded-lg"
                       >
                         <Trash2 size={14} />
                       </button>
                       <input 
                         placeholder="Provider (e.g. MTN MoMo)"
                         value={acc.provider}
                         onChange={e => {
                           const updated = [...(config.churchInfo?.transferAccounts || [])];
                           updated[aidx].provider = e.target.value;
                           setConfig({ ...config, churchInfo: { ...config.churchInfo, transferAccounts: updated }});
                         }}
                         className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 outline-none text-[11px] font-black text-tac-blue-dark dark:text-white pb-1 placeholder:text-gray-400"
                       />
                       <input 
                         placeholder="Number / Shortcode / Pay ID"
                         value={acc.details}
                         onChange={e => {
                           const updated = [...(config.churchInfo?.transferAccounts || [])];
                           updated[aidx].details = e.target.value;
                           setConfig({ ...config, churchInfo: { ...config.churchInfo, transferAccounts: updated }});
                         }}
                         className="w-full bg-transparent border-none outline-none text-[11px] font-black tracking-widest text-tac-red placeholder:text-tac-red/50"
                       />
                    </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Submission */}
         <div className="flex flex-col items-center gap-4">
            <button 
              type="submit"
              disabled={saving}
              className="w-full h-16 bg-tac-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-tac-blue/20 flex items-center justify-center gap-3 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
               {saving ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : success ? (
                 <>
                   <CheckCircle2 size={20} />
                   Site Content Updated
                 </>
               ) : (
                 <>
                   <Save size={20} />
                   Deploy Updates
                 </>
               )}
            </button>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black flex items-center gap-2">
               <Globe size={12} />
               Changes impact all assembly members instantly
            </p>
         </div>
      </form>
    </div>
  );
};

export default SiteSettings;
