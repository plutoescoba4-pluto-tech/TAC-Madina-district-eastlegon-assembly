import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Bell, 
  Calendar, 
  BookOpen, 
  Users, 
  ChevronRight, 
  Clock, 
  MapPin,
  Heart,
  TrendingUp,
  CircleDot,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ShieldCheck,
  Plus,
  Trash2
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { CHURCH_NAME, ASSEMBLY } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { collection, query, limit, onSnapshot, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Notice, Sermon, EventItem, HomeConfig, GalleryItem } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const HomeView: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [config, setConfig] = useState<HomeConfig>({
    id: 'main',
    theme: '',
    motto: '',
    services: [],
    announcement: '',
    heroUrl: 'https://images.unsplash.com/photo-1510451885245-1987b59cc5b1?w=1200&q=80'
  });
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isAdmin = profile?.role === 'admin';
  const logo = config?.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/antigravity-9999.appspot.com/o/applet_assets%2Fchurch_logo.png?alt=media';
  
  const slides = config.heroSlides && config.heroSlides.length > 0 
    ? config.heroSlides 
    : [config.heroUrl || 'https://images.unsplash.com/photo-1510451885245-1987b59cc5b1?w=1200&q=80'];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const newSlides = [...slides, result];
      await handleSaveConfig({ heroSlides: newSlides });
      setCurrentSlide(newSlides.length - 1);
    };
    reader.readAsDataURL(file);
  };

  const removeSlide = async (index: number) => {
    const updated = slides.filter((_, i) => i !== index);
    await handleSaveConfig({ heroSlides: updated });
    setCurrentSlide(0);
  };

  useEffect(() => {
    // Notices listener
    const qNotices = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(3));
    const unsubNotices = onSnapshot(qNotices, (s) => {
      setNotices(s.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notices');
    });

    // Home config listener
    const unsubConfig = onSnapshot(doc(db, 'settings', 'homeConfig'), (d) => {
       if (d.exists()) {
         setConfig(d.data() as HomeConfig);
       }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/homeConfig');
    });

    // Real-time member count
    const unsubCount = onSnapshot(collection(db, 'users'), (s) => {
      setMemberCount(s.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Events listener for calendar
    const qEvents = query(collection(db, 'events'), orderBy('startDate', 'asc'), limit(10));
    const unsubEvents = onSnapshot(qEvents, (s) => {
       setEvents(s.docs.map(d => ({ id: d.id, ...d.data() } as EventItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    // Gallery listener for latest media
    const qGallery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(6));
    const unsubGallery = onSnapshot(qGallery, (s) => {
       setGallery(s.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
    });

    return () => {
      unsubNotices();
      unsubConfig();
      unsubCount();
      unsubEvents();
      unsubGallery();
    };
  }, []);

  const handleSaveConfig = async (newConfig: Partial<HomeConfig>) => {
    try {
      await setDoc(doc(db, 'settings', 'homeConfig'), { ...config, ...newConfig }, { merge: true });
      setIsEditingConfig(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-3 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto overflow-x-hidden">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="text-2xl lg:text-4xl font-black font-serif text-tac-blue-dark dark:text-white leading-tight">
            Peace be with you, <br />
            <span className="text-tac-red">{profile?.name.split(' ')[0]}</span> 🙏
          </h1>
          <p className="text-[var(--Sub)] mt-1 lg:mt-2 text-xs lg:text-base font-medium">Welcome to the portal for {ASSEMBLY}.</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
           <div className="bg-white dark:bg-slate-800 rounded-2xl lg:rounded-3xl p-3 lg:p-4 shadow-sm border border-[var(--Bdr)] flex items-center gap-3 lg:gap-4 px-4 lg:px-6">
             <div className="text-right">
               <p className="text-[8px] lg:text-[10px] font-black uppercase text-tac-blue/30 tracking-widest">Active Members</p>
               <p className="text-base lg:text-xl font-black text-tac-blue-dark dark:text-white">{memberCount.toLocaleString()}</p>
             </div>
             <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center">
               <TrendingUp size={16} />
             </div>
           </div>
        </div>
      </header>
  
      {/* Hero Slideshow Section */}
      <section className="relative h-56 lg:h-[450px] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img 
              src={slides[currentSlide]} 
              className="w-full h-full object-cover" 
              alt={`Church Slide ${currentSlide + 1}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </motion.div>
        </AnimatePresence>

        {/* Slideshow Controls */}
        <div className="absolute inset-0 p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-3">
                <div className="w-2 h-2 bg-tac-red rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase text-white tracking-widest">Assembly Live Broadcast</span>
             </div>
             {isAdmin && (
               <div className="flex gap-2">
                 <input 
                   id="slide-upload" 
                   type="file" 
                   className="hidden" 
                   accept="image/*"
                   onChange={handleSlideUpload}
                 />
                 <button 
                   onClick={() => document.getElementById('slide-upload')?.click()}
                   className="p-3 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-tac-blue-dark rounded-full transition-all border border-white/20 flex items-center gap-2 group"
                 >
                   <Plus size={18} />
                   <span className="hidden group-hover:block text-[10px] font-black uppercase pr-1">Add Slide</span>
                 </button>
                 {slides.length > 1 && (
                   <button 
                     onClick={() => removeSlide(currentSlide)}
                     className="p-3 bg-red-500/20 backdrop-blur-md hover:bg-red-500 text-red-100 rounded-full transition-all border border-red-500/30 flex items-center gap-2 group"
                   >
                     <Trash2 size={18} />
                     <span className="hidden group-hover:block text-[10px] font-black uppercase pr-1">Remove</span>
                   </button>
                 )}
               </div>
             )}
          </div>

          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)}
              className="p-3 bg-black/20 backdrop-blur-md hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex items-end gap-1.5 pb-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-tac-red' : 'w-2 bg-white/30'}`} 
                />
              ))}
            </div>

            <button 
              onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)}
              className="p-3 bg-black/20 backdrop-blur-md hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRightIcon size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Dressed Up Assembly Theme Section */}
      <section className="relative overflow-hidden">
        <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] lg:rounded-[2.5rem] border border-[var(--Bdr)] shadow-xl p-6 lg:p-12 relative overflow-hidden group">
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-tac-blue/10 rounded-full -mr-20 -mt-20 blur-3xl opacity-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-tac-red/10 rounded-full -ml-20 -mb-20 blur-3xl opacity-20" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-8 space-y-4 lg:space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-tac-red/10 text-tac-red text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] px-3 lg:px-4 py-1.5 lg:py-2 rounded-full inline-block border border-tac-red/20">Assembly Theme</span>
                {isAdmin && (
                  <button 
                    onClick={() => setIsEditingConfig(!isEditingConfig)}
                    className="p-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 rounded-lg transition-all"
                  >
                    <ImageIcon size={14} />
                  </button>
                )}
              </div>

              {isEditingConfig ? (
                 <div className="space-y-4">
                   <textarea 
                     autoFocus
                     defaultValue={config.theme}
                     onBlur={(e) => handleSaveConfig({ theme: e.target.value })}
                     className="text-tac-blue-dark dark:text-white text-xl lg:text-5xl font-black font-serif leading-[1.1] tracking-tight bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none w-full p-4 lg:p-6 rounded-2xl lg:rounded-3xl h-32 lg:h-40"
                     placeholder="Enter Theme..."
                   />
                   <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4">
                     <input 
                        defaultValue={config.motto}
                        onBlur={(e) => handleSaveConfig({ motto: e.target.value })}
                        className="w-full text-tac-blue font-bold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none p-3 lg:p-4 rounded-xl lg:rounded-2xl"
                        placeholder="Enter Motto..."
                     />
                     <button 
                       onClick={() => setIsEditingConfig(false)}
                       className="w-full sm:w-auto px-6 py-3 lg:py-4 bg-tac-blue-dark dark:bg-tac-blue text-white rounded-xl lg:rounded-2xl font-black text-sm"
                     >
                       Save Changes
                     </button>
                   </div>
                 </div>
              ) : (
                 <div className="space-y-3 lg:space-y-4">
                  <h2 className="text-tac-blue-dark dark:text-white text-2xl lg:text-5xl font-black font-serif leading-[1.1] tracking-tight whitespace-pre-wrap">
                    {config.theme || "Define Assembly Theme"}
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="h-0.5 w-8 lg:w-12 bg-tac-red" />
                    <p className="text-tac-blue dark:text-tac-blue font-bold lg:text-xl italic drop-shadow-sm">
                      "{config.motto || "Assembly Motto"}"
                    </p>
                  </div>
                 </div>
              )}

              <div className="flex flex-wrap items-center gap-2 lg:gap-4 pt-2 lg:pt-4">
                 <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-[var(--Sub)] text-[9px] lg:text-xs font-black uppercase tracking-widest border border-gray-100 dark:border-white/10">
                   <Clock size={12} className="text-tac-red" /> <span>2024 · Ep 1</span>
                 </div>
                 <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-[var(--Sub)] text-[9px] lg:text-xs font-black uppercase tracking-widest border border-gray-100 dark:border-white/10">
                   <BookOpen size={12} className="text-tac-blue" /> <span>Genesis</span>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-tac-red/20 blur-3xl rounded-full scale-125 animate-pulse" />
                <div className="relative w-32 h-32 lg:w-56 lg:h-56 bg-tac-blue-dark rounded-3xl lg:rounded-[3.5rem] shadow-2xl flex items-center justify-center transform lg:rotate-3 transition-transform hover:rotate-0">
                  <img src={logo} alt="Logo Watermark" className="absolute inset-0 w-full h-full object-contain opacity-10 p-8 grayscale brightness-0 invert" />
                  <div className="text-center p-4 lg:p-6 space-y-1 lg:space-y-2 relative z-10">
                    <Heart size={32} className="text-tac-red mx-auto animate-bounce lg:w-12 lg:h-12" />
                    <p className="text-white text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em]">Grace & Peace</p>
                    <p className="text-white/40 text-[7px] lg:text-[8px] font-medium leading-tight">TAC GHANA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Notices */}
        <section className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
             <h3 className="text-xl font-black font-serif text-tac-blue-dark dark:text-white flex items-center gap-3">
               <Bell className="text-tac-red" size={24} /> Recent Notices
             </h3>
             <button onClick={() => navigate('/dashboard/notices')} className="text-sm font-bold text-tac-blue hover:underline">View All</button>
           </div>
           
           <div className="space-y-4">
             {notices.length > 0 ? notices.map(n => (
               <NoticeCard key={n.id} notice={n} />
             )) : (
               <div className="card text-center py-10 text-[var(--Sub)] italic text-sm">
                 Connecting to assembly broadcast...
               </div>
             )}
           </div>
        </section>

        {/* Quick Actions & Info */}
        <section className="space-y-8">
           <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black font-serif text-tac-blue-dark dark:text-white">Assembly Services</h3>
                {isAdmin && (
                  <button 
                    onClick={() => setIsEditingServices(!isEditingServices)}
                    className="text-[10px] font-black uppercase text-tac-blue px-3 py-1 bg-tac-blue/5 dark:bg-tac-blue/20 rounded-lg"
                  >
                    Edit
                  </button>
                )}
             </div>
             <div className="space-y-3">
               {config.services.map((s, idx) => (
                 <div key={s.id} className="relative group">
                    <ServiceTime 
                      label={s.label} 
                      time={s.time} 
                      icon={<CircleDot className={idx === 0 ? 'text-tac-red' : idx === 1 ? 'text-tac-blue' : 'text-tac-gold'} size={14} />} 
                    />
                    {isAdmin && isEditingServices && (
                       <button 
                        onClick={async () => {
                          const updated = config.services.filter(x => x.id !== s.id);
                          await handleSaveConfig({ services: updated });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                       >
                         <X size={12} />
                       </button>
                    )}
                 </div>
               ))}
               {isAdmin && isEditingServices && (
                 <button 
                  onClick={async () => {
                    const label = prompt("Service Name:");
                    const time = prompt("Service Time:");
                    if (label && time) {
                      const updated = [...config.services, { id: Date.now().toString(), label, time }];
                      await handleSaveConfig({ services: updated });
                    }
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:border-tac-blue hover:text-tac-blue transition-all"
                 >
                   + Add Service
                 </button>
               )}
             </div>
           </div>

           <div className="bg-tac-blue-dark rounded-[2rem] p-6 lg:p-8 text-white relative overflow-hidden shadow-xl shadow-tac-blue/20">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Heart size={80} /></div>
             <div className="relative z-10 space-y-4">
               <h4 className="text-xl font-black font-serif tracking-tight">Support Ministry</h4>
               <p className="text-white/60 text-sm leading-relaxed">Your TITHE and SEED supports our mission of global evangelism and charity.</p>
               <button 
                 onClick={() => navigate('/dashboard/give')}
                 className="w-full py-4 bg-white text-tac-blue-dark rounded-2xl font-black text-sm hover:bg-tac-red hover:text-white transition-all shadow-lg active:scale-95"
               >
                 Give Online Now
               </button>
             </div>
           </div>

           <div className="card bg-gray-50/50 dark:bg-slate-900/50 border-dashed border-2 border-[var(--Bdr)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-tac-blue-dark dark:text-white">Assembly Media</h4>
                <button onClick={() => navigate('/dashboard/gallery')} className="text-[10px] font-bold text-tac-blue dark:text-tac-blue-light hover:underline">View All</button>
              </div>
              {gallery.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                   {gallery.map(item => (
                     <div key={item.id} className="aspect-square bg-gray-200 dark:bg-slate-800 rounded-xl overflow-hidden hover:opacity-80 transition-opacity cursor-pointer shadow-sm">
                        {item.type === 'vid' ? (
                          <div className="w-full h-full bg-tac-blue-dark flex items-center justify-center text-white/50">
                            <CircleDot size={16} />
                          </div>
                        ) : (
                          <img src={item.src} alt="Media" className="w-full h-full object-cover" />
                        )}
                     </div>
                   ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[10px] text-[var(--Sub)] font-black uppercase tracking-widest opacity-40">
                  No media posted yet
                </div>
              )}
           </div>
        </section>
      </div>

      {/* Upcoming Events Horizontal */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black font-serif text-tac-blue-dark flex items-center gap-3">
            <Calendar className="text-tac-red" size={24} /> Upcoming Calendar
          </h3>
          <button onClick={() => navigate('/dashboard/events')} className="text-sm font-bold text-tac-blue hover:underline">Full Schedule</button>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-4 px-1 -mx-1 snap-x scrollbar-hide">
          {events.length > 0 ? events.map((ev, i) => (
             <EventSmallCard key={ev.id} event={ev} />
          )) : notices.filter(n => n.eventDate).map(n => (
             <EventSmallCard 
               key={n.id} 
               event={{ 
                 id: n.id, 
                 title: n.title, 
                 startDate: n.eventDate!, 
                 type: 'conference', 
                 summary: n.body,
                 createdAt: n.createdAt 
               }} 
             />
          ))}
          {events.length === 0 && notices.filter(n => n.eventDate).length === 0 && (
            <div className="w-full py-8 text-center text-[var(--Sub)] font-medium bg-gray-50 dark:bg-slate-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-white/10">
               No upcoming pinned events in the calendar.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const NoticeCard: React.FC<{ notice: Notice }> = ({ notice }) => (
  <motion.div 
    whileHover={{ x: 5 }}
    className="bg-white dark:bg-slate-800 border border-[var(--Bdr)] rounded-2xl p-4 shadow-sm flex gap-4 transition-all hover:bg-white dark:hover:bg-slate-700/50 hover:shadow-md cursor-pointer"
  >
    <div className={`shrink-0 w-1 rounded-full ${notice.type === 'pin' ? 'bg-tac-red' : notice.type === 'urg' ? 'bg-orange-500' : 'bg-tac-blue'}`} />
    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-tac-blue/40 tracking-widest">{notice.date}</span>
        {notice.type === 'pin' && <span className="text-[10px] font-black bg-tac-red/10 text-tac-red px-2 py-0.5 rounded-full uppercase tracking-tighter">Pinned</span>}
      </div>
      <h4 className="text-lg font-black text-tac-blue-dark dark:text-white tracking-tight leading-tight">{notice.title}</h4>
      <p className="text-sm text-[var(--Sub)] line-clamp-2 leading-relaxed">{notice.body}</p>
    </div>
    <div className="shrink-0 flex items-center text-tac-blue/20">
      <ChevronRight size={24} />
    </div>
  </motion.div>
);

const ServiceTime: React.FC<{ label: string; time: string; icon: React.ReactNode }> = ({ label, time, icon }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-[var(--Bdr)] shadow-sm">
    <div className="shrink-0">{icon}</div>
    <div className="flex-1">
      <p className="text-[10px] font-black uppercase text-[var(--Sub)] tracking-widest">{label}</p>
      <p className="text-sm font-bold text-tac-blue-dark dark:text-white">{time}</p>
    </div>
  </div>
);

const EventSmallCard: React.FC<{ event: EventItem }> = ({ event }) => {
  const date = new Date(event.startDate);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();

  return (
    <div className="shrink-0 w-64 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-[var(--Bdr)] shadow-sm snap-start space-y-4">
      <div className="flex items-start justify-between">
        <div className="bg-tac-red text-white w-12 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-tac-red/20">
          <span className="text-lg font-black font-serif leading-none">{day}</span>
          <span className="text-[9px] font-black uppercase tracking-widest mt-1">{month}</span>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-tac-blue/30"><MapPin size={20} /></div>
      </div>
      <div className="space-y-1">
         <h5 className="font-black text-tac-blue-dark dark:text-white leading-tight line-clamp-2">{event.title}</h5>
         <p className="text-[11px] text-[var(--Sub)] flex items-center gap-1 font-medium">
           {event.location || 'Assembiy Grounds'} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
         </p>
      </div>
    </div>
  );
};

export default HomeView;
