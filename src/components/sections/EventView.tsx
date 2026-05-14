import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  MapPin, 
  Clock, 
  Trash2, 
  Trophy,
  Users,
  Video,
  Info
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { EventItem } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const EventView: React.FC = () => {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'service' as EventItem['type'],
    summary: '',
    location: 'Main Auditorium'
  });

  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'asc'));
    const unsub = onSnapshot(q, (s) => {
      setEvents(s.docs.map(d => ({ id: d.id, ...d.data() } as EventItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return unsub;
  }, []);

  const isAdmin = profile?.role === 'admin';

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDate) return;

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewEvent({
        title: '',
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        type: 'service',
        summary: '',
        location: 'Main Auditorium'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this event?')) return;
    await deleteDoc(doc(db, 'events', id));
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getFilteredEvents = () => {
    if (filter === 'all') return events;
    return events.filter(e => e.type === filter);
  };

  const getDayEvents = (day: Date) => {
    return getFilteredEvents().filter(e => isSameDay(parseISO(e.startDate), day));
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Events Calendar</h2>
          <p className="text-[var(--Sub)] font-medium">Join us for fellowship, worship, and community programs.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white dark:bg-slate-800 border border-[var(--Bdr)] rounded-2xl p-1 shadow-sm">
             <button onClick={prevMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronLeft size={20} className="dark:text-white" /></button>
             <div className="px-4 flex items-center justify-center font-black text-tac-blue-dark dark:text-white min-w-[140px]">
               {format(currentMonth, 'MMMM yyyy')}
             </div>
             <button onClick={nextMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronRight size={20} className="dark:text-white" /></button>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(true)}
              className="p-3 bg-tac-red text-white rounded-2xl shadow-lg shadow-tac-red/20 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddEvent} className="card bg-tac-blue-dark text-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <CalendarIcon size={20} /> New Event Details
                </h3>
                <button type="button" onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest">Event Title</label>
                  <input 
                    required 
                    value={newEvent.title} 
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
                    placeholder="e.g. Easter Convention" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={newEvent.startDate} 
                    onChange={e => setNewEvent({...newEvent, startDate: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest">Event Type</label>
                  <select 
                    value={newEvent.type} 
                    onChange={e => setNewEvent({...newEvent, type: e.target.value as any})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                  >
                    <option value="service">Church Service</option>
                    <option value="conference">Conference</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other Activity</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest">Summary</label>
                  <input 
                    value={newEvent.summary} 
                    onChange={e => setNewEvent({...newEvent, summary: e.target.value})} 
                    placeholder="Brief description..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest">Location</label>
                  <input 
                    value={newEvent.location} 
                    onChange={e => setNewEvent({...newEvent, location: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-white text-tac-blue-dark rounded-2xl font-black shadow-xl active:scale-[0.98] transition-all">
                Publish to Calendar
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

        <div className="flex overflow-x-auto items-center gap-3 mb-2 pb-2 scrollbar-hide">
           <FilterButton active={filter === 'all'} label="All" onClick={() => setFilter('all')} count={events.length} />
           <FilterButton active={filter === 'service'} label="Services" onClick={() => setFilter('service')} color="bg-blue-500" count={events.filter(e => e.type === 'service').length} />
           <FilterButton active={filter === 'conference'} label="Conferences" onClick={() => setFilter('conference')} color="bg-red-500" count={events.filter(e => e.type === 'conference').length} />
           <FilterButton active={filter === 'meeting'} label="Meetings" onClick={() => setFilter('meeting')} color="bg-amber-500" count={events.filter(e => e.type === 'meeting').length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[var(--Bdr)] overflow-hidden shadow-sm">
             <div className="grid grid-cols-7 bg-gray-50 dark:bg-white/5 border-b border-[var(--Bdr)]">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                 <div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-tac-blue/40">{d}</div>
               ))}
             </div>
             <div className="grid grid-cols-7">
               {calendarDays.map((day, i) => {
                 const dayEvents = getDayEvents(day);
                 const isToday = isSameDay(day, new Date());
                 const isSelected = isSameDay(day, selectedDay);
                 const isCurrentMonth = isSameMonth(day, monthStart);

                 return (
                   <button 
                     key={i} 
                     onClick={() => setSelectedDay(day)}
                     className={`min-h-[100px] p-2 border-r border-b border-[var(--Bdr)] text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex flex-col items-start gap-1 relative ${!isCurrentMonth ? 'opacity-20 bg-gray-50/50 dark:bg-slate-900/50' : ''} ${isSelected ? 'bg-tac-blue/5 dark:bg-tac-blue/10 z-10 ring-2 ring-inset ring-tac-blue/10' : ''}`}
                   >
                     <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-tac-red text-white shadow-md shadow-tac-red/20' : isSelected ? 'bg-tac-blue text-white' : 'text-tac-blue-dark dark:text-white'}`}>
                       {format(day, 'd')}
                     </span>
                     
                     <div className="w-full space-y-1 mt-1 overflow-hidden">
                       {dayEvents.slice(0, 3).map(e => (
                         <div 
                           key={e.id} 
                           className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md truncate ${
                             e.type === 'service' ? 'bg-blue-100 text-blue-700' :
                             e.type === 'conference' ? 'bg-red-100 text-red-700' :
                             'bg-emerald-100 text-emerald-700'
                           }`}
                         >
                           {e.title}
                         </div>
                       ))}
                       {dayEvents.length > 3 && (
                         <div className="text-[8px] font-black text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                       )}
                     </div>
                   </button>
                 );
               })}
             </div>
          </div>
        </div>

        {/* Selected Day / Upcoming List */}
        <div className="space-y-6">
          <div className="card bg-white dark:bg-slate-800 p-6 sticky top-8">
            <h3 className="text-xl font-black text-tac-blue-dark dark:text-white mb-4 flex items-center justify-between">
              Events for {format(selectedDay, 'MMM d')}
              <span className="text-xs text-tac-red font-black uppercase tracking-widest">{getDayEvents(selectedDay).length} Scheduled</span>
            </h3>

            <div className="space-y-4">
              {getDayEvents(selectedDay).length > 0 ? (
                getDayEvents(selectedDay).map(event => (
                  <EventCard key={event.id} event={event} isAdmin={isAdmin} onDelete={e => handleDeleteEvent(event.id, e)} />
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-3xl">
                   <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-white/20 mb-3">
                     <Info size={24} />
                   </div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No events for this day</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--Bdr)]">
               <h4 className="text-[10px] font-black uppercase text-tac-blue/40 tracking-[0.2em] mb-4">Upcoming Next</h4>
               <div className="space-y-3">
                 {events.filter(e => parseISO(e.startDate) > selectedDay).slice(0, 3).map(e => (
                   <div key={e.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelectedDay(parseISO(e.startDate))}>
                      <div className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-xl flex flex-col items-center justify-center shrink-0 border border-[var(--Bdr)] group-hover:bg-tac-blue group-hover:text-white transition-all">
                        <span className="text-[8px] font-black uppercase">{format(parseISO(e.startDate), 'MMM')}</span>
                        <span className="text-xs font-black dark:text-white group-hover:text-white transition-colors">{format(parseISO(e.startDate), 'd')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-tac-blue-dark dark:text-tac-blue-light truncate group-hover:text-tac-red transition-all">{e.title}</p>
                        <p className="text-[9px] font-bold text-[var(--Sub)] uppercase">{format(parseISO(e.startDate), 'h:mm aa')} · {e.location}</p>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventCard: React.FC<{ event: EventItem; isAdmin: boolean; onDelete: (e: React.MouseEvent) => void }> = ({ event, isAdmin, onDelete }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-4 rounded-2xl border-l-4 transition-all hover:shadow-md ${
      event.type === 'service' ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-500' :
      event.type === 'conference' ? 'bg-red-50/50 dark:bg-red-500/10 border-red-500' :
      'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-500'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
           <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
             event.type === 'service' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
             event.type === 'conference' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
             'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
           }`}>{event.type}</span>
        </div>
        <h4 className="text-sm font-black text-tac-blue-dark dark:text-white leading-tight">{event.title}</h4>
        <p className="text-[10px] text-[var(--Sub)] leading-relaxed font-medium">{event.summary}</p>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 opacity-60">
           <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest">
             <Clock size={10} className="text-tac-red" /> {format(parseISO(event.startDate), 'h:mm aa')}
           </div>
           <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest">
             <MapPin size={10} className="text-tac-blue" /> {event.location}
           </div>
        </div>
      </div>
      {isAdmin && (
        <button onClick={onDelete} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  </motion.div>
);

export default EventView;

const FilterButton: React.FC<{ active: boolean; label: string; onClick: () => void; color?: string; count: number }> = ({ active, label, onClick, color = "bg-tac-blue", count }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
      active ? `${color} text-white shadow-lg` : 'bg-white dark:bg-slate-800 border border-[var(--Bdr)] text-[var(--Sub)] hover:border-tac-blue'
    }`}
  >
    {label}
    <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/5'}`}>{count}</span>
  </button>
);
