import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Shield, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  X, 
  Lock, 
  Send, 
  LayoutDashboard,
  Bell,
  LineChart,
  Megaphone,
  ChartBar,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer,
  Cell,
  LineChart as ReLineChart,
  Line
} from 'recharts';
import { collection, query, onSnapshot, doc, updateDoc, getDoc, increment, setDoc, addDoc, serverTimestamp, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Team, TeamTask, TeamNotice } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const TeamView: React.FC = () => {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingTeam, setSelectingTeam] = useState<Team | null>(null);
  const [joinType, setJoinType] = useState<'mentor' | 'member' | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [credentials, setCredentials] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [portalTab, setPortalTab] = useState<'dashboard' | 'chat' | 'notices' | 'tasks' | 'gallery' | 'members'>('dashboard');
  const [isAdminTeamModalOpen, setAdminTeamModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    (window as any).setTeamPortalTab = setPortalTab;
    return () => { delete (window as any).setTeamPortalTab; };
  }, []);
  
  // Real-time listeners for viewing team
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [teamNotices, setTeamNotices] = useState<TeamNotice[]>([]);
  const [teamGallery, setTeamGallery] = useState<any[]>([]);

  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!profile || !feedbackMessage.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'emergencyRequests'), {
        userId: profile.uid,
        userName: profile.name,
        userEmail: profile.email,
        message: feedbackMessage.trim(),
        status: 'unread',
        createdAt: serverTimestamp()
      });
      setFeedbackMessage('');
      setFeedbackModalOpen(false);
      alert("Your message has been sent to the Admin Emergency Board.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'emergencyRequests');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isMentor = viewingTeam && profile?.teams?.[viewingTeam.id] === 'mentor';

  // Sample teams if none in DB yet
  const defaultTeams: Team[] = [
    { id: 'media', name: 'Media & Tech', icon: '📱', color: 'from-blue-600 to-cyan-500', desc: 'Audio, video, live-streaming & social media. Mentors publish gallery media.', members: 0 },
    { id: 'choir', name: 'Choir & Worship', icon: '🎵', color: 'from-indigo-600 to-blue-500', desc: 'Spirit-filled worship every Sunday. Rehearsals Thursday 5 PM.', members: 0 },
    { id: 'youth', name: 'Youth Ministry', icon: '🔥', color: 'from-red-600 to-orange-400', desc: 'Discipleship, fellowship and outreach for the next generation.', members: 0 },
    { id: 'prayer', name: 'Prayer Warriors', icon: '🙏', color: 'from-purple-600 to-pink-500', desc: 'Intercession ministry. Tuesday & Friday morning watches.', members: 0 },
  ];

  useEffect(() => {
    const q = query(collection(db, 'teams'));
    return onSnapshot(q, (s) => {
      if (s.empty) {
        setTeams(defaultTeams);
      } else {
        const fetchedTeams = s.docs.map(d => ({ id: d.id, ...d.data() } as Team));
        // Merge with defaults if some defaults are missing in DB
        const finalTeams = [...fetchedTeams];
        defaultTeams.forEach(dt => {
           if (!fetchedTeams.find(ft => ft.id === dt.id)) {
             finalTeams.push(dt);
           }
        });
        setTeams(finalTeams);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teams');
    });
  }, []);

  // Listeners for subcollections when viewing a team
  useEffect(() => {
    if (!viewingTeam) return;

    const tasksQ = query(collection(db, 'teams', viewingTeam.id, 'tasks'), orderBy('createdAt', 'desc'));
    const noticesQ = query(collection(db, 'notices'), where('teamId', '==', viewingTeam.id), orderBy('createdAt', 'desc'));
    const galleryQ = query(collection(db, 'teams', viewingTeam.id, 'gallery'), orderBy('createdAt', 'desc'));

    const unsubTasks = onSnapshot(tasksQ, s => setTeamTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as TeamTask))), (error) => {
      handleFirestoreError(error, OperationType.LIST, `teams/${viewingTeam.id}/tasks`);
    });
    const unsubNotices = onSnapshot(noticesQ, s => setTeamNotices(s.docs.map(d => ({ id: d.id, ...d.data() } as TeamNotice))), (error) => {
      handleFirestoreError(error, OperationType.LIST, `notices`);
    });
    const unsubGallery = onSnapshot(galleryQ, s => setTeamGallery(s.docs.map(d => ({ id: d.id, ...d.data() } as any))), (error) => {
      handleFirestoreError(error, OperationType.LIST, `teams/${viewingTeam.id}/gallery`);
    });

    return () => {
      unsubTasks();
      unsubNotices();
      unsubGallery();
    };
  }, [viewingTeam]);

  const handleLeaveTeam = async () => {
    if (!profile || !viewingTeam) return;
    if (!confirm(`Are you sure you want to leave ${viewingTeam.name}?`)) return;

    setIsLeaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const teamRef = doc(db, 'teams', viewingTeam.id);
      
      const updatedTeams = { ...(profile.teams || {}) };
      delete updatedTeams[viewingTeam.id];
      
      await updateDoc(userRef, { teams: updatedTeams });
      await updateDoc(teamRef, { members: increment(-1) });
      
      setViewingTeam(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teams/${viewingTeam.id}/leave`);
      console.error('Leave failed:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleFinalizeJoin = async () => {
    if (!profile || !selectingTeam || !joinType) return;
    
    if (joinType === 'mentor' && accessCode !== '1234') {
      setError("Invalid Mentor Access Code.");
      return;
    }

    if (joinType === 'member' && !credentials.trim()) {
      setError("Please provide your service experience/interest.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', profile.uid);
      const teamRef = doc(db, 'teams', selectingTeam.id);
      
      const newTeams = { ...(profile.teams || {}), [selectingTeam.id]: joinType };
      await updateDoc(userRef, { teams: newTeams });
      
      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        await updateDoc(teamRef, { members: increment(1) });
      } else {
        const teamData = defaultTeams.find(t => t.id === selectingTeam.id);
        if (teamData) {
          await setDoc(teamRef, { ...teamData, members: 1 });
        }
      }

      // Add a joining notification/request if member
      if (joinType === 'member') {
        await addDoc(collection(db, 'notifications'), {
          userId: profile.uid,
          userName: profile.name,
          type: 'team_join',
          team: selectingTeam.name,
          credentials,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      setSelectingTeam(null);
      setJoinType(null);
      setAccessCode('');
      setCredentials('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teams/${selectingTeam.id}/join`);
      setError("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto relative min-h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Ministry Teams</h2>
          <p className="text-[var(--Sub)] font-medium">Find your place to serve in the body of Christ.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setAdminTeamModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-tac-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-tac-blue/20"
          >
            <Plus size={18} /> New Team
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {teams.map((team, i) => (
          <TeamCard 
            key={team.id} 
            team={team} 
            index={i}
            joined={!!profile?.teams?.[team.id]}
            onJoin={() => setSelectingTeam(team)}
            onView={() => setViewingTeam(team)}
          />
        ))}
      </div>

      {/* Global Join Selection Modal */}
      <AnimatePresence>
        {selectingTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => { setSelectingTeam(null); setJoinType(null); setError(null); }}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors z-10"
              >
                <X size={20} className="dark:text-white" />
              </button>

              <div className={`h-32 bg-gradient-to-br ${selectingTeam.color} flex flex-col items-center justify-center text-white`}>
                <span className="text-4xl mb-2">{selectingTeam.icon}</span>
                <h3 className="font-black uppercase tracking-widest text-sm">Join {selectingTeam.name}</h3>
              </div>

              <div className="p-8 space-y-6">
                {!joinType ? (
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => setJoinType('member')}
                      className="group p-6 border-2 border-gray-100 dark:border-white/5 rounded-3xl hover:border-tac-blue hover:bg-tac-blue/5 transition-all text-left flex items-start gap-4"
                    >
                      <div className="w-12 h-12 bg-tac-blue/10 text-tac-blue rounded-2xl flex items-center justify-center shrink-0">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="font-black text-tac-blue-dark dark:text-white">Join as Member</p>
                        <p className="text-xs text-[var(--Sub)] mt-1 font-medium">Ready to serve and be mentored. Requires credentials.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setJoinType('mentor')}
                      className="group p-6 border-2 border-gray-100 dark:border-white/5 rounded-3xl hover:border-tac-red hover:bg-tac-red/5 transition-all text-left flex items-start gap-4"
                    >
                      <div className="w-12 h-12 bg-tac-red/10 text-tac-red rounded-2xl flex items-center justify-center shrink-0">
                        <Shield size={24} />
                      </div>
                      <div>
                        <p className="font-black text-tac-red">Join as Mentor</p>
                        <p className="text-xs text-[var(--Sub)] mt-1 font-medium">Leadership role for experienced elders. Requires code.</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => setJoinType(null)} className="text-tac-blue text-xs font-black uppercase tracking-widest hover:underline">← Back</button>
                    </div>

                    {joinType === 'mentor' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-tac-blue/40 tracking-widest block ml-1">Mentor Access Code</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                          <input 
                            type="password"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            className="w-full h-14 bg-gray-50 border border-gray-100 dark:bg-white/5 dark:border-white/10 rounded-2xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-tac-red/10 focus:border-tac-red/30 transition-all font-black text-tac-red"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-tac-blue/40 tracking-widest block ml-1">Service Credentials</label>
                        <textarea 
                          placeholder="Tell us about your interest or experience..."
                          value={credentials}
                          onChange={(e) => setCredentials(e.target.value)}
                          className="w-full h-32 bg-gray-50 dark:bg-white/5 dark:border-white/10 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-tac-blue/10 focus:border-tac-blue/30 transition-all text-sm font-medium resize-none dark:text-white"
                        />
                      </div>
                    )}

                    {error && <p className="text-tac-red text-[10px] font-bold uppercase tracking-widest ml-1">{error}</p>}

                    <button 
                      onClick={handleFinalizeJoin}
                      disabled={isSubmitting}
                      className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${joinType === 'mentor' ? 'bg-tac-red text-white shadow-tac-red/20' : 'bg-tac-blue text-white shadow-tac-blue/20'}`}
                    >
                      {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                      {isSubmitting ? 'Processing...' : 'Complete Join'}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Dashboard Overlay */}
      <AnimatePresence>
        {viewingTeam && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[var(--Bg)] z-[120] flex flex-col lg:flex-row overflow-hidden shadow-2xl"
          >
            {/* Sidebar for Team Portal */}
            <div className={`w-full lg:w-80 bg-gradient-to-b ${viewingTeam.color} p-8 text-white flex flex-col relative`}>
               <button 
                onClick={() => setViewingTeam(null)}
                className="absolute top-6 right-6 lg:relative lg:top-0 lg:right-0 lg:mb-12 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center transition-all lg:self-start"
               >
                 <X size={24} />
               </button>

               <div className="flex-1 flex flex-col items-center text-center">
                  <span className="text-7xl mb-6 drop-shadow-2xl">{viewingTeam.icon}</span>
                  <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter leading-none mb-4">{viewingTeam.name}</h2>
                  <p className="text-white/70 text-sm font-medium mb-8 max-w-[200px]">{viewingTeam.desc}</p>
                  
                  <div className="w-full bg-white/10 rounded-3xl p-6 backdrop-blur-md border border-white/10 space-y-6">
                     <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/50 border-b border-white/5 pb-2">
                        <span>Ministry Metrics</span>
                        <ChartBar size={14} />
                     </div>
                     <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <ReBarChart data={[
                              { name: 'Tasks', val: teamTasks.length },
                              { name: 'Docs', val: teamGallery.length },
                              { name: 'Notes', val: teamNotices.length }
                           ]}>
                              <Bar dataKey="val" fill="white" radius={[4, 4, 4, 4]} opacity={0.6} />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                           </ReBarChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                        <div className="text-left">
                           <p className="text-2xl font-black">{viewingTeam.members}</p>
                           <p className="text-[9px] font-bold uppercase opacity-50">Members</p>
                        </div>
                        <div className="text-left border-l border-white/10 pl-4">
                           <p className="text-2xl font-black">{teamTasks.filter(t => t.status === 'pending').length}</p>
                           <p className="text-[9px] font-bold uppercase opacity-50">Pending</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="mt-auto pt-8 flex flex-col gap-3">
                   <TeamPortalLink icon={<LayoutDashboard size={18} />} label="View Full Status" active={portalTab === 'dashboard'} onClick={() => setPortalTab('dashboard')} />
                   <TeamPortalLink icon={<MessageSquare size={18} />} label="Team Chat" active={portalTab === 'chat'} onClick={() => setPortalTab('chat')} />
                   <TeamPortalLink icon={<Bell size={18} />} label="Notices" active={portalTab === 'notices'} onClick={() => setPortalTab('notices')} />
                   <TeamPortalLink icon={<LineChart size={18} />} label="Tasks" active={portalTab === 'tasks'} onClick={() => setPortalTab('tasks')} />
                   {isMentor && <TeamPortalLink icon={<Users size={18} />} label="Members List" active={portalTab === 'members'} onClick={() => setPortalTab('members')} />}
                   <TeamPortalLink icon={<Plus size={18} />} label="Gallery" active={portalTab === 'gallery'} onClick={() => setPortalTab('gallery')} />
                   
                   <button 
                     onClick={handleLeaveTeam}
                     disabled={isLeaving}
                     className="mt-4 flex items-center gap-4 px-6 py-4 rounded-2xl bg-black/10 hover:bg-black/20 text-white transition-all w-full text-left"
                   >
                     {isLeaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <X size={18} />}
                     <span className="text-xs font-black uppercase tracking-widest opacity-80">Leave Team</span>
                   </button>
                </div>
            </div>

            {/* Main view for Team Portal */}
            <div className="flex-1 bg-[#f8fafb] dark:bg-slate-900 overflow-y-auto p-6 lg:p-12">
               <PortalContent 
                  tab={portalTab} 
                  team={viewingTeam} 
                  isMentor={isMentor} 
                  tasks={teamTasks}
                  notices={teamNotices}
                  gallery={teamGallery}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Create Team Modal */}
      <AnimatePresence>
         {isAdminTeamModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative"
              >
                  <button onClick={() => setAdminTeamModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                  <h3 className="text-2xl font-black text-tac-blue-dark font-serif mb-6">Create New Ministry</h3>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-tac-blue-dark opacity-40 ml-1">Team Name</label>
                           <input id="new-team-name" type="text" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-black text-tac-blue-dark outline-none focus:border-tac-blue" placeholder="Media, Choir..." />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-tac-blue-dark opacity-40 ml-1">Icon (Emoji)</label>
                           <input id="new-team-icon" type="text" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm text-center outline-none focus:border-tac-blue" placeholder="🎵" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-tac-blue-dark opacity-40 ml-1">Description</label>
                         <textarea id="new-team-desc" className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-medium resize-none outline-none focus:border-tac-blue" placeholder="Detailed objective of this team..."></textarea>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-tac-blue-dark opacity-40 ml-1">Theme Gradient</label>
                         <select id="new-team-color" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-black outline-none appearance-none">
                            <option value="from-blue-600 to-cyan-500">Blue/Cyan</option>
                            <option value="from-red-600 to-orange-400">Red/Orange</option>
                            <option value="from-indigo-600 to-blue-500">Indigo/Blue</option>
                            <option value="from-purple-600 to-pink-500">Purple/Pink</option>
                            <option value="from-emerald-600 to-teal-500">Emerald/Teal</option>
                         </select>
                      </div>

                      <button 
                        onClick={async () => {
                          const name = (document.getElementById('new-team-name') as HTMLInputElement).value;
                          const icon = (document.getElementById('new-team-icon') as HTMLInputElement).value;
                          const desc = (document.getElementById('new-team-desc') as HTMLTextAreaElement).value;
                          const color = (document.getElementById('new-team-color') as HTMLSelectElement).value;

                          if (!name || !icon || !desc) return;

                          const tid = name.toLowerCase().replace(/\s+/g, '-');
                          await setDoc(doc(db, 'teams', tid), {
                             id: tid,
                             name,
                             icon,
                             desc,
                             color,
                             members: 0,
                             createdAt: serverTimestamp()
                          });
                          setAdminTeamModalOpen(false);
                        }}
                        className="w-full h-14 bg-tac-blue-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-4"
                      >
                         Establish Ministry Team
                      </button>
                  </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      <div className="card bg-tac-blue/5 dark:bg-tac-blue/10 border-dashed border-2 border-[var(--Bdr)] flex flex-col md:flex-row items-center gap-6 p-8">
         <div className="w-16 h-16 bg-tac-blue text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
           <Info size={32} />
         </div>
         <div className="flex-1 text-center md:text-left">
           <h3 className="text-lg font-black text-tac-blue-dark dark:text-tac-blue-light">Don't see a team for you?</h3>
           <p className="text-sm text-[var(--Sub)] mt-1 font-medium">We are always expanding our ministries. Contact the Presbytery office to discuss new service opportunities or suggestions.</p>
         </div>
         <button 
           onClick={() => setFeedbackModalOpen(true)}
           className="px-8 py-3 bg-tac-blue-dark dark:bg-tac-blue text-white rounded-xl font-bold active:scale-95 transition-all shrink-0 shadow-lg"
         >
           Contact Us
         </button>
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative border-2 border-tac-blue/10"
             >
                <button onClick={() => setFeedbackModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="dark:text-white" />
                </button>
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-tac-blue/10 rounded-2xl flex items-center justify-center text-tac-blue">
                      <MessageSquare size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-tac-blue-dark dark:text-white uppercase tracking-tight">Support Desk</h3>
                      <p className="text-[10px] font-bold text-[var(--Sub)] uppercase tracking-widest">Connect with Admin Board</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-sm text-[var(--Sub)] font-medium italic">
                     "Tell us the ministry you'd like to see, or any issue you are facing. Your message goes directly to our Emergency Review Tab."
                   </p>
                   <textarea 
                     placeholder="Type your issue or suggestion here..."
                     value={feedbackMessage}
                     onChange={(e) => setFeedbackMessage(e.target.value)}
                     className="w-full h-40 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5 text-sm font-medium outline-none focus:ring-2 focus:ring-tac-blue/20 transition-all resize-none dark:text-white"
                   />
                   <button 
                     onClick={handleFeedbackSubmit}
                     disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                     className="w-full h-14 bg-tac-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-tac-blue/20 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                   >
                      {isSubmittingFeedback ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                      {isSubmittingFeedback ? 'Sending...' : 'Submit to Emergency Board'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TeamCard: React.FC<{ team: Team; index: number; joined: boolean; onJoin: () => void; onView: () => void }> = ({ team, index, joined, onJoin, onView }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="card group hover:shadow-xl hover:shadow-tac-blue/5 transition-all flex flex-col overflow-hidden border-2"
  >
    <div 
      onClick={joined ? onView : undefined}
      className={`h-32 bg-gradient-to-br ${team.color || 'from-gray-600 to-gray-400'} flex items-center justify-center relative cursor-pointer overflow-hidden`}
    >
      <span className="text-5xl drop-shadow-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all scale-100 group-hover:scale-125 duration-700 z-10">{team.icon}</span>
      <div className="absolute inset-0 bg-black/10 mix-blend-overlay group-hover:bg-transparent transition-colors" />
      {joined && (
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-lg p-2 text-white border border-white/10 flex items-center gap-2">
           <LayoutDashboard size={14} />
           <span className="text-[8px] font-black uppercase tracking-widest">Portal Active</span>
        </div>
      )}
    </div>

    <div className="p-6 flex-1 flex flex-col space-y-4">
      <div>
        <div className="flex items-center justify-between font-black text-tac-blue-dark dark:text-white text-xl tracking-tight">
          {team.name}
          {joined && <CheckCircle2 size={18} className="text-green-500" />}
        </div>
        <p className="text-[11px] font-black uppercase text-tac-blue/30 dark:text-tac-blue-light/30 tracking-[0.2em] mt-1 text-left">{team.members} Members Enrolled</p>
      </div>

      <p className="text-sm text-[var(--Sub)] leading-relaxed font-medium flex-1 text-left">
        {team.desc}
      </p>

      <div className="pt-4 flex gap-2">
        {joined ? (
          <button 
            onClick={onView}
            className="flex-1 py-3 bg-tac-blue text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-tac-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <ChevronRight size={16} /> Enter Portal
          </button>
        ) : (
          <button 
            onClick={onJoin}
            className="flex-1 py-3 bg-tac-red text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-tac-red-dark transition-all shadow-lg shadow-tac-red/20 active:scale-95"
          >
            Join Team
          </button>
        )}
        <button 
          onClick={joined ? () => { onView(); (window as any).setTeamPortalTab?.('chat'); } : onJoin}
          className="p-3 bg-gray-50 dark:bg-slate-700 text-tac-blue hover:bg-tac-blue hover:text-white rounded-xl transition-all shadow-sm border border-[var(--Bdr)]"
        >
           <MessageSquare size={18} />
        </button>
      </div>
    </div>
  </motion.div>
);

const TeamPortalLink: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, badge?: string, onClick?: () => void }> = ({ icon, label, active, badge, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all w-full text-left group ${active ? 'bg-white text-tac-blue shadow-xl' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
  >
    <span className={`${active ? 'text-tac-red' : 'group-hover:translate-x-1 transition-transform'}`}>{icon}</span>
    <span className="text-sm font-black uppercase tracking-widest flex-1">{label}</span>
    {badge && <span className="text-[10px] bg-tac-red text-white px-2 py-0.5 rounded-full animate-pulse">{badge}</span>}
  </button>
);

const TeamSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-6">
     <h4 className="text-[10px] font-black uppercase text-tac-blue/30 tracking-[0.3em] font-serif ml-1">{title}</h4>
     <div className="space-y-4">{children}</div>
  </div>
);

export default TeamView;

interface PortalProps {
  tab: string;
  team: Team;
  isMentor: boolean;
  tasks: TeamTask[];
  notices: TeamNotice[];
  gallery: any[];
}

const PortalContent: React.FC<PortalProps> = ({ tab, team, isMentor, tasks, notices, gallery }) => {
  const { profile } = useAuth();
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    if (tab === 'chat') {
       const q = query(collection(db, 'teams', team.id, 'chat'), orderBy('createdAt', 'desc'), limit(100));
       return onSnapshot(q, s => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() })).reverse()), (error) => {
         handleFirestoreError(error, OperationType.LIST, `teams/${team.id}/chat`);
       });
    }
    if (tab === 'members') {
       const q = query(collection(db, 'users'), where(`teams.${team.id}`, 'in', ['member', 'mentor']));
       return onSnapshot(q, s => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => {
         handleFirestoreError(error, OperationType.LIST, 'users');
       });
    }
  }, [tab, team.id]);

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Phone'];
    const rows = teamMembers.map(m => [
      m.name,
      m.email,
      m.teams?.[team.id] || 'member',
      m.phone || 'N/A'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${team.name}_members.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendChat = async () => {
    if (!inputText.trim() || !profile) return;
    try {
      await addDoc(collection(db, 'teams', team.id, 'chat'), {
        senderId: profile.uid,
        senderName: profile.name,
        senderColor: profile.color || 'bg-tac-blue',
        text: inputText.trim(),
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setInputText('');
    } catch (e) {
      console.error(e);
    }
  };

  switch (tab) {
    case 'chat':
      return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-[#e5ddd5] dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none dark:invert" style={{ backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)' }} />
          <div className="p-4 bg-[#075e54] dark:bg-slate-800 text-white flex items-center justify-between z-10 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-black">{team.icon}</div>
              <div>
                <h4 className="font-black text-sm">{team.name} Chat</h4>
                <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">Internal Ministry COMMS</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-black tracking-widest uppercase animate-pulse">Live</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 z-10 scrollbar-hide">
             {chatMessages.map((m) => (
               <div key={m.id} className={`flex flex-col ${m.senderId === profile?.uid ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl text-sm font-medium max-w-[85%] shadow-sm relative ${m.senderId === profile?.uid ? 'bg-[#dcf8c6] dark:bg-tac-blue dark:text-white text-gray-800 rounded-tr-none' : 'bg-white dark:bg-slate-800 dark:text-white text-gray-800 rounded-tl-none'}`}>
                    {m.senderId !== profile?.uid && <p className="text-[10px] font-black uppercase text-tac-blue dark:text-tac-blue-light mb-1">{m.senderName}</p>}
                    <p className="leading-relaxed">{m.text}</p>
                    <p className="text-[8px] text-gray-400 dark:text-white/40 text-right mt-1 font-bold">{m.time}</p>
                  </div>
               </div>
             ))}
          </div>
          <div className="p-4 bg-[#f0f0f0] dark:bg-slate-900 flex gap-3 z-10 items-center">
             <input 
               value={inputText}
               onChange={e => setInputText(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSendChat()}
               placeholder="Type a message"
               className="flex-1 bg-white dark:bg-white/5 dark:text-white border-none rounded-full h-12 px-6 text-sm font-medium outline-none shadow-sm"
             />
             <button onClick={handleSendChat} className="w-12 h-12 bg-[#128c7e] dark:bg-tac-blue text-white rounded-full active:scale-95 transition-all shadow-lg flex items-center justify-center">
               <Send size={20} />
             </button>
          </div>
        </div>
      );
    case 'members':
      return (
        <div className="space-y-8">
           <div className="flex items-center justify-between">
              <h4 className="text-xl font-black text-tac-blue-dark dark:text-white tracking-tight">Team Roster</h4>
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                <Plus size={14} /> Export to Excel (CSV)
              </button>
           </div>
           <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Member</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Role</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Contact</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {teamMembers.map(m => (
                       <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${m.color || 'bg-tac-blue'} text-white flex items-center justify-center text-xs font-black`}>{m.name[0]}</div>
                                <span className="font-bold text-tac-blue-dark dark:text-white">{m.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.teams?.[team.id] === 'mentor' ? 'bg-tac-red/10 text-tac-red' : 'bg-tac-blue/10 text-tac-blue'}`}>
                                {m.teams?.[team.id]}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                             {m.email}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      );
    case 'tasks':
      return (
        <div className="space-y-8">
           <div className="flex items-center justify-between">
              <h4 className="text-xl font-black text-tac-blue-dark dark:text-white tracking-tight">Active Assignments</h4>
              {isMentor && (
                <button 
                  onClick={async () => {
                    const title = prompt("Task Title:");
                    if (title) {
                      await addDoc(collection(db, 'teams', team.id, 'tasks'), {
                        title,
                        status: 'pending',
                        createdAt: serverTimestamp()
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-tac-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus size={14} /> New Task
                </button>
              )}
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.length > 0 ? tasks.map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600'}`}>
                         {t.status === 'completed' ? <CheckCircle2 size={20} /> : <Shield size={20} />}
                      </div>
                      <div>
                         <p className="font-black text-tac-blue-dark dark:text-white">{t.title}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.status === 'completed' ? 'Archived' : 'In Progress'}</p>
                      </div>
                   </div>
                   {isMentor && t.status === 'pending' && (
                     <button 
                      onClick={() => updateDoc(doc(db, 'teams', team.id, 'tasks', t.id), { status: 'completed' })}
                      className="p-2 text-tac-blue/20 group-hover:text-green-500 transition-colors"
                     >
                       <CheckCircle2 size={20} />
                     </button>
                   )}
                </div>
              )) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 dark:border-white/10 rounded-3xl">
                   <p className="text-sm font-medium text-gray-400 italic">No tasks assigned yet.</p>
                </div>
              )}
           </div>
        </div>
      );
    case 'notices':
        return (
          <div className="space-y-8">
             <div className="flex items-center justify-between">
                <h4 className="text-xl font-black text-tac-blue-dark dark:text-white tracking-tight">Team Announcements</h4>
                {isMentor && (
                  <button 
                    onClick={async () => {
                      const title = prompt("Message Title:");
                      const body = prompt("Message Body:");
                      if (title && body && profile) {
                        await addDoc(collection(db, 'notices'), {
                          title,
                          body,
                          type: 'gen',
                          teamId: team.id,
                          author: profile.name,
                          createdAt: serverTimestamp()
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-tac-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Megaphone size={14} /> Post Update
                  </button>
                )}
             </div>
             <div className="space-y-4">
                {notices.map(n => (
                   <div key={n.id} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-tac-blue" />
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-tac-blue dark:text-tac-blue-light">Board Update</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Latest</span>
                     </div>
                     <h5 className="font-black text-xl text-tac-blue-dark dark:text-white leading-none mb-3">{n.title}</h5>
                     <p className="text-sm text-[var(--Sub)] font-medium leading-relaxed">{n.body}</p>
                  </div>
                ))}
             </div>
          </div>
        );
    case 'gallery':
      return (
        <div className="space-y-8">
           <div className="flex items-center justify-between">
              <h4 className="text-xl font-black text-tac-blue-dark dark:text-white tracking-tight">Media Archives</h4>
              {isMentor && (
                <button 
                  onClick={async () => {
                    const src = prompt("Image URL:");
                    if (src) {
                      await addDoc(collection(db, 'teams', team.id, 'gallery'), {
                        src,
                        type: 'img',
                        createdAt: serverTimestamp()
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-tac-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus size={14} /> Add Media
                </button>
              )}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {gallery.map(g => (
                <div key={g.id} className="aspect-square rounded-3xl overflow-hidden shadow-sm group relative">
                   <img src={g.src} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="team gallery" referrerPolicy="no-referrer" />
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all cursor-pointer" />
                </div>
              ))}
           </div>
        </div>
      );
    default:
      return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
               <div className="text-left">
                  <h3 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tighter">Team Dashboard</h3>
                  <p className="text-sm text-[var(--Sub)] font-medium">Ongoing activities and team internal updates.</p>
               </div>
               {isMentor && (
                 <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-tac-blue dark:text-tac-blue-light rounded-xl font-bold transition-all shadow-sm">
                       <Megaphone size={18} /> Notify All
                    </button>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <TeamSection title="Latest Activity">
                  {notices.length > 0 ? notices.slice(0, 2).map(n => (
                     <div key={n.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-3 text-left">
                        <div className="flex items-center justify-between">
                           <span className="px-3 py-1 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue dark:text-tac-blue-light rounded-lg text-[9px] font-black uppercase tracking-widest">Team Notice</span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">New</span>
                        </div>
                        <p className="font-black text-tac-blue-dark dark:text-white leading-tight">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-2">{n.body}</p>
                     </div>
                  )) : (
                     <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                        <p className="text-xs text-gray-400 font-medium">No recent notices</p>
                     </div>
                  )}
               </TeamSection>

               <TeamSection title="Tasks Overview">
                  <div className="space-y-4">
                     {tasks.length > 0 ? tasks.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center gap-4 group text-left p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-50 dark:border-white/5 shadow-sm">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600'}`}>
                              <CheckCircle2 size={16} />
                           </div>
                           <div className="flex-1">
                              <p className="text-xs font-black text-gray-800 dark:text-white">{t.title}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.status}</p>
                           </div>
                        </div>
                     )) : (
                        <p className="text-xs text-gray-400 italic">No tasks currently tracked.</p>
                     )}
                  </div>
               </TeamSection>
            </div>
            
            <div className="text-center py-12 border-t border-gray-100 dark:border-white/5 mt-12">
               <p className="text-[10px] font-black uppercase text-tac-blue/20 tracking-[0.4em]">End of Dashboard Content</p>
            </div>
         </div>
      );
  }
};
