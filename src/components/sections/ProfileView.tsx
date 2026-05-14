import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  LogOut, 
  Camera, 
  ChevronRight,
  UserCheck,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const ProfileView: React.FC = () => {
  const { profile } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [editingField, setEditingField] = useState<{ key: string; label: string; current: string } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (!profile) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setIsUpdating(true);
        try {
          await updateDoc(doc(db, 'users', profile.uid), { picUrl: result });
        } catch (err) {
          alert("Failed to update profile picture.");
        } finally {
          setIsUpdating(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEdit = (key: string, label: string) => {
    setEditingField({ key, label, current: (profile as any)[key] || '' });
    setNewValue((profile as any)[key] || '');
  };

  const handleSave = async () => {
    if (!editingField || !profile) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { [editingField.key]: newValue });
      setEditingField(null);
    } catch (err) {
      alert("Failed to update profile. Check permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 relative min-h-full">
      <header className="flex flex-col md:flex-row md:items-end gap-6 pb-6 border-b border-[var(--Bdr)]">
        <div className="relative group">
           <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-4 ring-white overflow-hidden transition-transform group-hover:scale-[1.02] ${profile.color || 'bg-tac-blue'}`}>
              {profile.picUrl ? <img src={profile.picUrl} className="w-full h-full object-cover" alt="Profile" /> : profile.name[0]}
              {isUpdating && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
           </div>
           <label className="absolute -bottom-2 -right-2 p-3 bg-white text-tac-blue rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all border border-gray-100 cursor-pointer">
             <Camera size={20} />
             <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
           </label>
        </div>
        <div className="flex-1 space-y-1 text-left">
           <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white uppercase tracking-tighter">{profile.name}</h2>
           <p className="text-[var(--Sub)] font-medium flex items-center gap-2">
             <UserCheck size={16} className="text-tac-blue" />
             {profile.role.toUpperCase()} · Member since {new Date(profile.joinedDate).getFullYear()}
           </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {/* Account Info */}
        <div className="md:col-span-2 space-y-6">
          <Section label="Membership Information">
            <SettingItem icon={<Shield size={18} />} title="Member ID" value={profile.userId || 'NOT SET'} onClick={() => handleStartEdit('userId', 'Member ID')} action="Edit" />
            <SettingItem icon={<User size={18} />} title="Full Name" value={profile.name} onClick={() => handleStartEdit('name', 'Full Name')} action="Edit" />
            <SettingItem icon={<User size={18} />} title="Occupation" value={profile.occupation || 'NOT SET'} onClick={() => handleStartEdit('occupation', 'Occupation')} action="Edit" />
            <SettingItem icon={<Calendar size={18} />} title="Date of Birth" value={profile.dateOfBirth || 'NOT SET'} onClick={() => handleStartEdit('dateOfBirth', 'Date of Birth')} action="Edit" />
            <SettingItem icon={<Settings size={18} />} title="Mobile Contact" value={profile.phone || 'NOT SET'} onClick={() => handleStartEdit('phone', 'Phone Number')} action="Edit" />
          </Section>

          <Section label="Preferences">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-[var(--Bdr)] shadow-sm">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-50 dark:bg-slate-700 text-tac-blue rounded-xl text-left">
                   {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                 </div>
                 <div className="text-left">
                   <p className="font-bold text-sm text-tac-blue-dark dark:text-white">Dark Mode</p>
                   <p className="text-[10px] text-[var(--Sub)] font-bold uppercase tracking-widest">Theme preference</p>
                 </div>
               </div>
               <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-tac-blue' : 'bg-gray-200'}`}
               >
                 <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-[var(--Bdr)] shadow-sm space-y-4">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-50 dark:bg-slate-700 text-tac-blue rounded-xl text-left">
                   <Settings size={18} />
                 </div>
                 <div className="text-left">
                   <p className="font-bold text-sm text-tac-blue-dark dark:text-white">Chat Background</p>
                   <p className="text-[10px] text-[var(--Sub)] font-bold uppercase tracking-widest">Global & Direct Chat Walls</p>
                 </div>
               </div>
               <div className="grid grid-cols-4 gap-2">
                 {['#e5ddd5', 'bg-gray-100', 'bg-[#efeae2]', 'bg-blue-50', 'bg-slate-900', 'bg-stone-200', 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png', 'https://w0.peakpx.com/wallpaper/433/515/HD-wallpaper-whatsapp-doodle-doodles-pattern-patterns-whatsapp-background-whatsapp-doodle.jpg'].map((bg, idx) => (
                   <button 
                     key={idx}
                     onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'users', profile.uid), { chatBg: bg });
                        } catch (err) {
                           console.error(err);
                        }
                     }}
                     className={`aspect-square rounded-xl border-2 transition-all overflow-hidden ${profile.chatBg === bg ? 'border-tac-blue scale-110 shadow-lg' : 'border-black/5 hover:border-tac-blue/30'}`}
                   >
                     {bg.startsWith('http') ? (
                       <img src={bg} className="w-full h-full object-cover" alt="" />
                     ) : (
                       <div className={`w-full h-full ${bg.startsWith('#') ? '' : bg}`} style={bg.startsWith('#') ? { backgroundColor: bg } : {}} />
                     )}
                   </button>
                 ))}
               </div>
            </div>

            <SettingItem icon={<Bell size={18} />} title="Notifications" value="All mentions & alerts" action="Change" />
          </Section>

          <button 
            onClick={() => auth.signOut()}
            className="w-full p-6 bg-red-500/5 text-red-500 rounded-3xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100"
          >
            <LogOut size={20} />
            Sign Out of Account
          </button>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="card p-6 bg-tac-blue-dark text-white space-y-4">
             <h4 className="text-sm font-black uppercase tracking-widest text-white/40">Profile Status</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                   <span className="opacity-60">Completion</span>
                   <span>{profile.phone && profile.picUrl ? '100%' : profile.phone || profile.picUrl ? '90%' : '80%'}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-tac-red transition-all duration-700" style={{ width: profile.phone && profile.picUrl ? '100%' : profile.phone || profile.picUrl ? '90%' : '80%' }} />
                </div>
             </div>
             <p className="text-[10px] opacity-40 font-medium text-left">Add a profile picture and phone number to reach 100%.</p>
          </div>

          <div className="card dark:bg-slate-800 p-6 space-y-4">
             <h4 className="text-sm font-black text-tac-blue-dark dark:text-white uppercase tracking-widest text-left">Active Segments</h4>
             <div className="flex flex-wrap gap-2 justify-start">
                <span className="px-3 py-1 bg-tac-blue/5 text-tac-blue rounded-full text-[10px] font-black uppercase">{profile.role}</span>
                {profile.teams && Object.entries(profile.teams).map(([id, role]) => (
                  <span key={id} className="px-3 py-1 bg-tac-red/5 text-tac-red rounded-full text-[10px] font-black uppercase">{id} {role}</span>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {editingField && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl space-y-6"
             >
                <div className="text-left">
                  <h3 className="text-[10px] font-black uppercase text-tac-blue/40 tracking-widest mb-1">Update {editingField.label}</h3>
                  <p className="text-lg font-black text-tac-blue-dark dark:text-white font-serif">Quick Profile Change</p>
                </div>

                <div className="space-y-4">
                   <input 
                    type="text"
                    autoFocus
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-6 outline-none focus:ring-2 focus:ring-tac-blue/10 dark:bg-white/5 dark:text-white dark:border-white/10"
                   />
                   <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => setEditingField(null)}
                        className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all dark:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={isUpdating}
                        className="flex-1 py-4 bg-tac-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-tac-blue/20 flex items-center justify-center gap-2"
                      >
                        {isUpdating && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isUpdating ? 'Saving...' : 'Update Now'}
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

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-3">
    <h3 className="text-[10px] font-black uppercase text-tac-blue/40 tracking-[0.2em] ml-1 text-left">{label}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const SettingItem: React.FC<{ icon: React.ReactNode; title: string; value: string; action?: string; onClick?: () => void }> = ({ icon, title, value, action, onClick }) => (
  <div 
    onClick={onClick}
    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-[var(--Bdr)] shadow-sm hover:border-tac-blue/20 transition-all cursor-pointer group"
  >
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-gray-50 dark:bg-slate-700 text-tac-blue rounded-xl group-hover:bg-tac-blue group-hover:text-white transition-all">
        {icon}
      </div>
      <div className="text-left">
        <p className="font-bold text-sm text-tac-blue-dark dark:text-white">{value}</p>
        <p className="text-[10px] text-[var(--Sub)] font-bold uppercase tracking-widest">{title}</p>
      </div>
    </div>
    {action ? (
      <span className="text-xs font-black text-tac-blue uppercase tracking-widest">{action}</span>
    ) : (
      <ChevronRight size={16} className="text-tac-blue/20" />
    )}
  </div>
);

export default ProfileView;
