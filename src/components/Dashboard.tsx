import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  Users, 
  MessageSquare, 
  Heart, 
  Image as ImageIcon,
  Bell,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Settings,
  Shield,
  Search,
  Church,
  Info,
  ScrollText,
  Music4,
  HardHat,
  Plus,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Megaphone,
  Zap,
  ChevronLeft
} from 'lucide-react';
import { DISTRICT, ASSEMBLY, CHURCH_LOGO } from '../constants';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Notice, HomeConfig } from '../types';
import { collection, query, orderBy, onSnapshot, limit, setDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

// Components
import HomeView from './sections/HomeView';
import NoticeView from './sections/NoticeView';
import SermonView from './sections/SermonView';
import EventView from './sections/EventView';
import GalleryView from './sections/GalleryView';
import TeamView from './sections/TeamView';
import ChatView from './sections/ChatView';
import DirectMessageView from './sections/DirectMessageView';
import NetworkView from './sections/NetworkView';
import GiveView from './sections/GiveView';
import ChurchInfo from './sections/ChurchInfo';
import ProfileView from './sections/ProfileView';
import AdminInbox from './sections/AdminInbox';
import UpdateView from './sections/UpdateView';
import ChurchList from './sections/ChurchList';
import SiteSettings from './sections/SiteSettings';
import HymnView from './sections/HymnView';
import ConductView from './sections/ConductView';
import ProfileCompletion from './sections/ProfileCompletion';
import NotificationView from './sections/NotificationView';

const Dashboard: React.FC = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notice | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [unreadEmergencies, setUnreadEmergencies] = useState(0);
  const [isEmergencyPanelOpen, setEmergencyPanelOpen] = useState(false);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'member' | 'presbytery' | 'admin'>('member');
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Real-time Notification Listener
  useEffect(() => {
    if (!user || !profile) return;

    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      
      const latestNotice = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Notice;
      const lastSeenId = localStorage.getItem(`lastSeenNotice_${user.uid}`);
      
      // If it's a new notice (id changed and it's not the one we just saw)
      if (latestNotice.id !== lastSeenId) {
        // Show popup
        setActiveNotification(latestNotice);
        // Automatically hide after 8 seconds
        setTimeout(() => setActiveNotification(prev => prev?.id === latestNotice.id ? null : prev), 8000);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notices');
    });

    return () => unsubscribe();
  }, [user, profile]);

  // Pending Updates Listener for Admin
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const q = query(collection(db, 'updateRequests'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (s) => {
      setPendingUpdates(s.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'updateRequests');
    });

    return unsub;
  }, [profile]);

  // Unread Emergencies Listener for Admin
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const q = query(collection(db, 'emergencyRequests'), where('status', '==', 'unread'));
    const unsub = onSnapshot(q, (s) => {
      setUnreadEmergencies(s.size);
      setEmergencies(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      // Avoid spamming error for non-admins if they try to listen
      if (profile.role === 'admin') {
        handleFirestoreError(error, OperationType.LIST, 'emergencyRequests');
      }
    });

    return unsub;
  }, [profile]);

  // Unread Notices Listener for All
  useEffect(() => {
    if (!user || !profile) return;

    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (s) => {
      const lastSeenId = localStorage.getItem(`lastSeenNotice_${user.uid}`);
      if (!lastSeenId) {
        setUnreadNotices(s.size);
      } else {
        const docs = s.docs;
        const lastSeenIndex = docs.findIndex(d => d.id === lastSeenId);
        if (lastSeenIndex === -1) {
          setUnreadNotices(s.size);
        } else {
          setUnreadNotices(lastSeenIndex);
        }
      }
    });

    return unsub;
  }, [user, profile]);

  const markEmergencyRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'emergencyRequests', id), { status: 'read' });
    } catch (e) {
      console.error(e);
    }
  };

  const markNotificationSeen = (id: string) => {
    if (user) {
      localStorage.setItem(`lastSeenNotice_${user.uid}`, id);
    }
    setActiveNotification(null);
  };

  const handleCreateProfile = async () => {
    if (!user) return;
    
    if (selectedRole === 'admin' && adminPass !== '1234') {
      setError("Incorrect Admin Password.");
      return;
    }

    setCreatingProfile(true);
    setError(null);
    try {
      const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const payload = {
        uid: user.uid,
        name: user.displayName || 'TAC Member',
        email: user.email || '',
        phone: user.phoneNumber || '',
        role: selectedRole,
        color: randomColor,
        joinedDate: new Date().toISOString(),
        online: true,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), payload);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || "Failed to initialize profile. Please contact admin.");
    } finally {
      setCreatingProfile(false);
    }
  };

  const [siteConfig, setSiteConfig] = useState<HomeConfig | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'homeConfig'), (d) => {
      if (d.exists()) setSiteConfig(d.data() as HomeConfig);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/homeConfig');
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-tac-blue-dark">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 mb-4"
        >
          <img src={CHURCH_LOGO} alt="Logo" className="w-full h-full object-contain" />
        </motion.div>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">TAC Ghana Madina District</p>
        <p className="text-white/20 text-[8px] font-bold uppercase tracking-[0.2em] mt-1">Eastlegon Assembly</p>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--Bg)] p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-tac-blue/10 rounded-3xl flex items-center justify-center mb-8 text-tac-blue shadow-inner"
        >
          <Shield size={48} />
        </motion.div>
        
        <h2 className="text-3xl font-black font-serif text-tac-blue-dark mb-3">Initialize Portal</h2>
        <p className="text-[var(--Sub)] max-w-sm mb-8 leading-relaxed font-medium">
          Welcome to the {DISTRICT} digital portal. Please select your role to continue.
        </p>

        <div className="w-full max-w-sm mb-8 space-y-6">
           <div className="grid grid-cols-3 gap-3">
              {(['member', 'presbytery', 'admin'] as const).map(role => (
                <button 
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedRole === role ? 'border-tac-blue bg-tac-blue/5' : 'border-gray-100'}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedRole === role ? 'text-tac-blue' : 'text-gray-300'}`}>{role}</span>
                  {role === 'admin' && <Shield size={16} className={selectedRole === 'admin' ? 'text-tac-blue' : 'text-gray-200'} />}
                </button>
              ))}
           </div>

           {selectedRole === 'admin' && (
             <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-2"
             >
                <label className="text-[10px] font-black uppercase text-tac-blue/40 tracking-widest text-left block">Admin Passkey</label>
                <input 
                  type="password" 
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full h-14 bg-white border border-[var(--Bdr)] rounded-2xl px-6 outline-none focus:ring-2 focus:ring-tac-blue/5"
                />
             </motion.div>
           )}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left max-w-sm">
            <X className="text-tac-red shrink-0 mt-0.5" size={16} />
            <p className="text-tac-red text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button 
            onClick={handleCreateProfile}
            disabled={creatingProfile}
            className="group relative w-full h-16 bg-tac-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 overflow-hidden shadow-xl shadow-tac-blue/20 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {creatingProfile ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={20} />
            )}
            {creatingProfile ? 'Building Profile...' : 'Complete Registration'}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => window.location.reload()}
              disabled={creatingProfile}
              className="h-14 border border-[var(--Bdr)] bg-white text-[var(--Sub)] rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
            >
              <Search size={14} />
              Retry
            </button>
            <button 
              onClick={() => auth.signOut()}
              disabled={creatingProfile}
              className="h-14 border border-[var(--Bdr)] bg-white text-[var(--Sub)] rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:border-tac-red/20 hover:text-tac-red transition-all"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-3 text-tac-blue/40 font-black uppercase tracking-widest text-[10px]">
           <div className="w-8 h-[1px] bg-tac-blue/10" />
           {DISTRICT} Portal Security
           <div className="w-8 h-[1px] bg-tac-blue/10" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (profile.isProfileComplete === false) {
    return <ProfileCompletion profile={profile} onComplete={refreshProfile} />;
  }

  const isAdmin = profile.role === 'admin';
  const isPresbytery = profile.role === 'presbytery';
  const isStaff = isAdmin || isPresbytery;

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[var(--Bg)] overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -280 }}
        className="fixed lg:static inset-y-0 left-0 w-[280px] bg-tac-blue-dark z-50 flex flex-col shadow-2xl transition-transform lg:translate-x-0"
      >
        <div className="p-6 pt-10 overflow-y-auto flex-1">
            <div className="flex items-center gap-4 mb-10 px-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl ring-8 ring-white/5">
                 <img src={CHURCH_LOGO} alt="The Apostolic Church Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-black text-base leading-none uppercase tracking-tighter truncate">TAC GHANA</h2>
                <p className="text-white/40 text-[9px] uppercase font-bold tracking-[0.2em] mt-1.5 truncate">{DISTRICT}</p>
                <p className="text-white/30 text-[8px] uppercase font-bold tracking-widest mt-0.5 truncate">{ASSEMBLY}</p>
              </div>
            </div>

             <div className="space-y-1">
               <NavGroup title="Main">
                 <NavItem to="/dashboard" icon={<Home size={20} />} label="Home" active={location.pathname === '/dashboard'} onClick={() => setSidebarOpen(false)} />
                 <NavItem to="/dashboard/sermons" icon={<BookOpen size={20} />} label="Sermons" active={location.pathname === '/dashboard/sermons'} onClick={() => setSidebarOpen(false)} />
                 <NavItem to="/dashboard/events" icon={<Calendar size={20} />} label="Events" active={location.pathname === '/dashboard/events'} onClick={() => setSidebarOpen(false)} />
                 <NavItem to="/dashboard/gallery" icon={<ImageIcon size={20} />} label="Gallery" active={location.pathname === '/dashboard/gallery'} onClick={() => setSidebarOpen(false)} />
               </NavGroup>

               <NavGroup title="Spiritual">
                  <NavItem to="/dashboard/hymns" icon={<Music4 size={20} />} label="Hymns" active={location.pathname === '/dashboard/hymns'} onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/dashboard/conduct" icon={<ScrollText size={20} />} label="Protocol & Conduct" active={location.pathname === '/dashboard/conduct'} onClick={() => setSidebarOpen(false)} />
               </NavGroup>

               <NavGroup title="Ministry">
                 <NavItem to="/dashboard/notices" icon={<Bell size={20} />} label="Notices" active={location.pathname === '/dashboard/notices'} onClick={() => setSidebarOpen(false)} />
                 {isStaff && <NavItem to="/dashboard/updates" icon={<Zap size={20} />} label="Updates" active={location.pathname === '/dashboard/updates'} badge={isAdmin && pendingUpdates > 0 ? pendingUpdates.toString() : undefined} onClick={() => setSidebarOpen(false)} />}
                 <NavItem to="/dashboard/teams" icon={<Users size={20} />} label="Teams" active={location.pathname === '/dashboard/teams'} onClick={() => setSidebarOpen(false)} />
                 <NavItem to="/dashboard/network" icon={<Zap size={20} />} label="Network" active={location.pathname === '/dashboard/network'} onClick={() => setSidebarOpen(false)} />
                 <NavItem to="/dashboard/chat" icon={<MessageSquare size={20} />} label="Church Chat" active={location.pathname === '/dashboard/chat'} onClick={() => setSidebarOpen(false)} />
               </NavGroup>

               {(isAdmin || isPresbytery) && (
                 <NavGroup title="Administration">
                   {isAdmin && <NavItem to="/dashboard/admin/inbox" icon={<Shield size={20} />} label="Admin Inbox" active={location.pathname === '/dashboard/admin/inbox'} badge="2" onClick={() => setSidebarOpen(false)} />}
                   <NavItem to="/dashboard/admin/members" icon={<Users size={20} />} label="Church List" active={location.pathname === '/dashboard/admin/members'} onClick={() => setSidebarOpen(false)} />
                   {isAdmin && <NavItem to="/dashboard/admin/settings" icon={<Settings size={20} />} label="Site Settings" active={location.pathname === '/dashboard/admin/settings'} onClick={() => setSidebarOpen(false)} />}
                 </NavGroup>
               )}

               <NavGroup title="Other">
                  <NavItem to="/dashboard/give" icon={<Heart size={20} />} label="Give / Tithe" active={location.pathname === '/dashboard/give'} onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/dashboard/profile" icon={<UserIcon size={20} />} label="My Profile" active={location.pathname === '/dashboard/profile'} onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/dashboard/info" icon={<Info size={20} />} label="Information" active={location.pathname === '/dashboard/info'} onClick={() => setSidebarOpen(false)} />
               </NavGroup>
             </div>
        </div>

        <div className="p-6 space-y-4 bg-black/10 border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner ${profile.color || 'bg-tac-blue'}`}>
               {profile.picUrl ? <img src={profile.picUrl} className="w-full h-full object-cover rounded-full" /> : profile.name[0]}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-white text-sm font-black truncate">{profile.name}</p>
               <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{profile.role}</p>
             </div>
             <Link to="/dashboard/profile" className="text-white/30 hover:text-white transition-colors">
               <MoreHorizontal size={20} />
             </Link>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-sm font-black transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-[var(--Bdr)] flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 shadow-sm shadow-black/5">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="lg:hidden p-2 text-tac-blue-dark dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
              <Menu size={24} />
            </button>
            {location.pathname !== '/dashboard' && (
              <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 p-2 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-tac-blue hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 h-10 rounded-full text-tac-blue/40 focus-within:ring-2 focus-within:ring-tac-blue/5 focus-within:border-tac-blue/20 transition-all">
              <Search size={18} />
              <input type="text" placeholder="Search portal..." className="bg-transparent border-none outline-none text-sm text-[var(--Text)] dark:text-white font-medium w-48 lg:w-64 placeholder:text-gray-300 dark:placeholder:text-white/20" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <div className="hidden xs:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black uppercase text-tac-blue dark:text-tac-blue-light tracking-tighter bg-tac-blue/5 dark:bg-tac-blue/20 px-2 py-0.5 rounded-full">{profile.role}</span>
             </div>
              {isAdmin && (
                <div className="relative">
                  <div 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      setEmergencyPanelOpen(!isEmergencyPanelOpen);
                      // Clear unread numbers when viewed
                      if (!isEmergencyPanelOpen && unreadEmergencies > 0) {
                        for (const em of emergencies) {
                          if (em.status === 'unread') {
                            await markEmergencyRead(em.id);
                          }
                        }
                      }
                    }}
                    className="p-2.5 text-tac-blue-dark dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors group cursor-pointer"
                  >
                    <Shield size={20} className={unreadEmergencies > 0 ? "text-tac-red animate-pulse" : ""} />
                    {unreadEmergencies > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-tac-red text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-black animate-bounce">
                        {unreadEmergencies}
                      </span>
                    )}
                  </div>
                  
                  {/* Emergency Dropdown */}
                  <AnimatePresence>
                    {isEmergencyPanelOpen && (
                      <>
                        {/* Invisible overlay to close on click outside */}
                        <div className="fixed inset-0 z-40" onClick={() => setEmergencyPanelOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="fixed sm:absolute top-20 sm:top-full left-4 right-4 sm:left-auto sm:right-0 mt-2 sm:w-80 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-[100] pointer-events-auto max-h-[80vh] flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-4 bg-tac-red text-white flex items-center justify-between shrink-0">
                              <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Shield size={14} /> Emergency Console
                              </h4>
                              <button onClick={() => setEmergencyPanelOpen(false)} className="p-1 hover:bg-white/20 rounded-full sm:hidden">
                                <X size={16} />
                              </button>
                          </div>
                          <div className="overflow-y-auto flex-1 divide-y divide-gray-50 dark:divide-white/5 bg-white dark:bg-slate-800">

                              {emergencies.length > 0 ? emergencies.map((em) => (
                                <div key={em.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left">
                                  <div className="flex items-center justify-between mb-2">
                                      <span className="font-black text-[10px] uppercase text-tac-blue-dark dark:text-white truncate">{em.userName}</span>
                                      <span className="text-[8px] font-bold text-gray-400">{em.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-xs text-[var(--Sub)] font-medium leading-relaxed mb-3 line-clamp-3">{em.message}</p>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => markEmergencyRead(em.id)}
                                        className="flex-1 py-2 bg-tac-blue/10 text-tac-blue rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-tac-blue hover:text-white transition-all"
                                      >
                                        Acknowledge
                                      </button>
                                      <button 
                                        onClick={() => { navigate('/dashboard/admin/inbox'); setEmergencyPanelOpen(false); }}
                                        className="p-2 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-lg hover:text-tac-red transition-all"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                  </div>
                                </div>
                              )) : (
                                <div className="p-8 text-center opacity-30">
                                  <CheckCircle2 size={32} className="mx-auto mb-2" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">No unread emergencies</p>
                                </div>
                              )}
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-white/5 text-center">
                              <button 
                                onClick={() => { navigate('/dashboard/admin/inbox'); setEmergencyPanelOpen(false); }}
                                className="text-[9px] font-black uppercase tracking-widest text-tac-blue hover:underline"
                              >
                                View All Requests
                              </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button 
                onClick={() => navigate('/dashboard/notifications')}
                className="relative p-2.5 text-tac-blue-dark dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <Bell size={20} className={unreadNotices > 0 ? "text-tac-red animate-pulse" : ""} />
                {unreadNotices > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-tac-red text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-black">
                    {unreadNotices > 9 ? '9+' : unreadNotices}
                  </span>
                )}
              </button>
             <button onClick={() => navigate('/dashboard/profile')} className="p-0.5 border-2 border-transparent hover:border-tac-blue/20 rounded-full transition-all">
               <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${profile.color || 'bg-tac-blue'}`}>
                 {profile.picUrl ? <img src={profile.picUrl} className="w-full h-full object-cover rounded-full" /> : profile.name[0]}
               </div>
             </button>
          </div>
        </header>

        {/* Global Announcement Alert Bar */}
        <AnimatePresence>
          {siteConfig?.announcement && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-tac-red text-white overflow-hidden"
            >
               <div className="px-4 lg:px-8 py-2 flex items-center justify-center gap-3">
                  <Megaphone size={14} className="shrink-0 animate-bounce" />
                  <p className="text-[10px] xs:text-[11px] font-black uppercase tracking-widest text-center truncate">
                    {siteConfig.announcement}
                  </p>
                  <Info size={14} className="shrink-0 opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => navigate('/dashboard/notices')} />
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto bg-[var(--Bg)] scroll-smooth relative">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/notices" element={<NoticeView />} />
            <Route path="/sermons" element={<SermonView />} />
            <Route path="/events" element={<EventView />} />
            <Route path="/gallery" element={<GalleryView />} />
            <Route path="/teams" element={<TeamView />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/network" element={<NetworkView />} />
            <Route path="/updates" element={<UpdateView />} />
            <Route path="/chat/direct/:dmId" element={<DirectMessageView />} />
            <Route path="/give" element={<GiveView />} />
            <Route path="/hymns" element={<HymnView />} />
            <Route path="/conduct" element={<ConductView />} />
            <Route path="/info" element={<ChurchInfo />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/notifications" element={<NotificationView />} />
            <Route path="/admin/inbox" element={<AdminInbox />} />
            <Route path="/admin/members" element={<ChurchList />} />
            <Route path="/admin/settings" element={<SiteSettings />} />
          </Routes>
        </main>

        {/* Real-time Notification Popup */}
        <AnimatePresence>
          {activeNotification && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-24 inset-x-0 flex justify-center z-[100] px-4 pointer-events-none"
            >
               <motion.div 
                className="pointer-events-auto bg-tac-blue-dark text-white p-5 rounded-3xl shadow-2xl border border-white/10 flex flex-col gap-3 relative overflow-hidden group w-full max-w-[400px]"
                whileHover={{ scale: 1.02 }}
               >
                  <div className="absolute top-0 left-0 w-1 h-full bg-tac-red" />
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-tac-red font-black text-[10px] uppercase tracking-widest">
                       <Bell size={14} className="animate-swing" />
                       New Assembly Notice
                    </div>
                    <button 
                      onClick={() => markNotificationSeen(activeNotification.id)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-lg font-black leading-tight mb-1">{activeNotification.title}</h4>
                    <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{activeNotification.body}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button 
                      onClick={() => {
                        markNotificationSeen(activeNotification.id);
                        navigate('/dashboard/notifications');
                      }}
                      className="text-[10px] font-black uppercase tracking-widest bg-white text-tac-blue-dark px-4 py-2 rounded-xl transition-transform active:scale-95"
                    >
                      Read Full Notice
                    </button>
                    <button 
                      onClick={() => markNotificationSeen(activeNotification.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white px-4 py-2 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Live Ticker */}
        <div className="h-8 bg-tac-blue-dark px-4 flex items-center justify-between text-white/50 text-[10px] uppercase font-serif tracking-[0.2em]">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
             <span>Live Updates Enabled</span>
           </div>
           <span className="hidden sm:inline">The Apostolic Church · {DISTRICT} · {ASSEMBLY} · {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

const NavGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] mb-3 ml-3">{title}</h4>
    <nav className="space-y-1">
      {children}
    </nav>
  </div>
);

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }> = ({ to, icon, label, active, badge, onClick }) => (
  <Link 
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${active ? 'bg-white text-tac-blue-dark shadow-xl' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
  >
    <span className={`${active ? 'text-tac-red' : 'group-hover:text-white transition-colors'}`}>{icon}</span>
    <span className="flex-1">{label}</span>
    {badge && <span className="px-2 py-0.5 bg-tac-red text-white text-[9px] rounded-full font-black shadow-lg animate-bounce">{badge}</span>}
  </Link>
);

export default Dashboard;
