import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  MessageSquare,
  ChevronRight,
  Filter,
  Zap,
  Shield,
  Heart,
  Crown,
  BarChart3,
  TrendingUp,
  Activity,
  Mic,
  StopCircle,
  Play,
  Send,
  X,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { UserProfile } from '../../types';

const NetworkView: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'presbytery' | 'admin'>('all');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (s) => {
      setMembers(s.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsub;
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setShowAudioPreview(true);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = (shouldSave = true) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      if (!shouldSave) {
        setAudioUrl(null);
        setAudioBlob(null);
        setShowAudioPreview(false);
      }
    }
  };

  const handleSendAudio = async () => {
    if (!audioUrl || !audioBlob || !user || !profile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await addDoc(collection(db, 'chats', 'global', 'messages'), {
          senderId: user.uid,
          senderName: profile.name,
          senderColor: profile.color || 'bg-tac-blue',
          text: "🎤 Voice message shared from Network",
          audio: base64,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: serverTimestamp()
        });
        setAudioUrl(null);
        setAudioBlob(null);
        setShowAudioPreview(false);
        alert('Voice message shared to Church Chat!');
      } catch (err) {
        console.error('Send failed:', err);
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMembers = members.filter(m => {
    // Hide myself
    if (m.uid === user?.uid) return false;
    // Hide people with no names
    if (!m.name) return false;

    const matchesSearch = (
      m.name.toLowerCase().includes(search.toLowerCase()) || 
      m.email?.toLowerCase().includes(search.toLowerCase())
    );

    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'online' ? m.online :
      filter === 'presbytery' ? m.role === 'presbytery' :
      filter === 'admin' ? m.role === 'admin' : true;

    return matchesSearch && matchesFilter;
  });

  const startPrivateChat = (otherUid: string) => {
    if (!user) return;
    const ids = [user.uid, otherUid].sort();
    const dmId = `${ids[0]}_${ids[1]}`;
    navigate(`/dashboard/chat/direct/${dmId}`);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 min-h-screen pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-tac-blue rounded-xl flex items-center justify-center text-white shadow-lg">
                <Zap size={20} fill="currentColor" />
             </div>
             <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Presbytery Network</h2>
          </div>
          <p className="text-[var(--Sub)] font-medium">Connect privately with fellow members and leaders.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tac-blue transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search people..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-800 border border-[var(--Bdr)] rounded-2xl w-full sm:w-64 outline-none focus:ring-4 focus:ring-tac-blue/5 focus:border-tac-blue/20 dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
        <FilterTag active={filter === 'all'} label="All Members" onClick={() => setFilter('all')} icon={<Users size={14} />} />
        <FilterTag active={filter === 'online'} label="Online Now" onClick={() => setFilter('online')} icon={<div className="w-2 h-2 bg-green-500 rounded-full" />} />
        <FilterTag active={filter === 'presbytery'} label="Presbytery" onClick={() => setFilter('presbytery')} icon={<Crown size={14} />} />
        <FilterTag active={filter === 'admin'} label="Administrators" onClick={() => setFilter('admin')} icon={<Shield size={14} />} />
      </div>

      {/* Network Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {/* Audio Recording Bar */}
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className={`p-4 rounded-[2rem] border shadow-xl transition-all flex items-center justify-between group ${isRecording ? 'bg-tac-red border-tac-red/20 shadow-tac-red/20' : 'bg-tac-blue border-tac-blue/20 shadow-tac-blue/10'}`}
         >
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isRecording ? 'bg-white/20 animate-pulse' : 'bg-white/20'}`}>
                  {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
               </div>
               <div>
                  <h3 className="font-black text-white uppercase tracking-widest text-[10px]">
                    {isRecording ? 'Recording...' : 'Network Audio'}
                  </h3>
                  <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest leading-none mt-1">
                    {isRecording ? `Time: ${formatTime(recordingTime)}` : 'Share voice thoughts'}
                  </p>
               </div>
            </div>
            <button 
              onClick={isRecording ? () => stopRecording(true) : startRecording}
              className={`px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all ${isRecording ? 'bg-white text-tac-red' : 'bg-white text-tac-blue'}`}
            >
               {isRecording ? 'Stop' : 'Record'}
            </button>
         </motion.div>

         {/* Audio Preview Overlay (Portal-like) */}
         <AnimatePresence>
            {showAudioPreview && audioUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-x-4 bottom-24 lg:left-auto lg:right-8 lg:w-96 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/10 z-[100]"
              >
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[10px] font-black uppercase text-tac-blue tracking-widest">Preview Voice Note</h4>
                     <button onClick={() => setShowAudioPreview(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"><X size={16} /></button>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-6">
                     <button 
                        onClick={() => new Audio(audioUrl).play()}
                        className="w-12 h-12 bg-tac-blue text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                     >
                        <Play size={20} />
                     </button>
                     <div className="flex-1">
                        <div className="h-1 bg-tac-blue/10 rounded-full w-full overflow-hidden">
                           <div className="h-full bg-tac-blue w-2/3" />
                        </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => { setAudioUrl(null); setAudioBlob(null); setShowAudioPreview(false); }}
                        className="py-3 bg-red-50 text-tac-red rounded-xl text-[10px] font-black uppercase tracking-widest"
                     >
                        Discard
                     </button>
                     <button 
                        onClick={handleSendAudio}
                        className="py-3 bg-tac-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-tac-blue/20"
                     >
                        Share to Chat
                     </button>
                  </div>
              </motion.div>
            )}
         </AnimatePresence>

         {/* Online Presence - Minimized */}
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-[var(--Bdr)] shadow-sm flex items-center justify-between"
         >
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                  <Activity size={20} />
               </div>
               <div>
                  <h3 className="font-black text-tac-blue-dark dark:text-white uppercase tracking-widest text-[10px]">Real-time Status</h3>
                  <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{members.filter(m => m.online).length} Online</span>
                  </div>
               </div>
            </div>
            <div className="flex flex-col items-end">
               <p className="text-xl font-black text-tac-blue-dark dark:text-white leading-none">{Math.round((members.filter(m => m.online).length / (members.length || 1)) * 100)}%</p>
               <p className="text-[8px] font-black uppercase text-gray-400">Activity</p>
            </div>
         </motion.div>

         {/* Total Active - Minimized */}
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-[var(--Bdr)] shadow-sm flex items-center justify-between md:col-span-2 lg:col-span-1"
         >
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-tac-blue/10 text-tac-blue rounded-xl flex items-center justify-center">
                  <Users size={20} />
               </div>
               <div>
                  <h3 className="font-black text-tac-blue-dark dark:text-white uppercase tracking-widest text-[10px]">Total Members</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Active Database</p>
               </div>
            </div>
            <div className="flex flex-col items-end">
               <p className="text-xl font-black text-tac-blue-dark dark:text-white leading-none">{members.length}</p>
               <p className="text-[8px] font-black uppercase text-gray-400">Users</p>
            </div>
         </motion.div>
      </div>



      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
           <div className="w-12 h-12 border-4 border-tac-blue/10 border-t-tac-blue rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tac-blue/40">Syncing Network...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           <AnimatePresence mode="popLayout">
             {filteredMembers.map((member, idx) => (
               <motion.div 
                 key={member.uid}
                 layout
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ delay: idx * 0.03 }}
                 onClick={() => startPrivateChat(member.uid)}
                 className="group bg-white dark:bg-slate-800 rounded-[2rem] p-5 border border-[var(--Bdr)] hover:border-tac-blue/20 hover:shadow-2xl hover:shadow-tac-blue/5 transition-all cursor-pointer relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-tac-blue/5 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-xl font-black text-white ${member.color || 'bg-tac-blue'}`}>
                        {member.picUrl ? <img src={member.picUrl} className="w-full h-full object-cover rounded-2xl" /> : member.name[0]}
                      </div>
                      {member.online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                      )}
                    </div>
                    <div>
                        <h4 className="font-black text-tac-blue-dark dark:text-white leading-none mb-1 group-hover:text-tac-blue transition-colors line-clamp-1">{member.name}</h4>
                        <div className="flex items-center gap-2">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                             member.role === 'admin' ? 'bg-tac-red/10 text-tac-red' : 
                             member.role === 'presbytery' ? 'bg-tac-gold/10 text-tac-gold' : 
                             'bg-tac-blue/10 text-tac-blue'
                           }`}>
                             {member.role}
                           </span>
                           {member.role === 'presbytery' && <Crown size={12} className="text-tac-gold" />}
                        </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between relative z-10">
                    <div className="flex -space-x-2">
                       <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 border-2 border-white dark:border-slate-800 flex items-center justify-center text-gray-400 group-hover:bg-tac-blue group-hover:text-white transition-all">
                          <MessageSquare size={14} />
                       </div>
                    </div>
                    <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-tac-blue translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                       Chat Now
                       <ChevronRight size={14} />
                    </button>
                  </div>
               </motion.div>
             ))}
           </AnimatePresence>

           {filteredMembers.length === 0 && (
             <div className="col-span-full py-24 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                   <Users size={32} />
                </div>
                <h3 className="text-lg font-black text-tac-blue-dark dark:text-white">No members found</h3>
                <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const FilterTag: React.FC<{ active: boolean; label: string; onClick: () => void; icon: React.ReactNode }> = ({ active, label, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shadow-sm ${
      active 
        ? 'bg-tac-blue-dark text-white border-tac-blue-dark shadow-xl shadow-tac-blue/10 scale-105' 
        : 'bg-white dark:bg-slate-800 text-gray-400 border-[var(--Bdr)] hover:bg-gray-50 dark:hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default NetworkView;
