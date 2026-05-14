import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Calendar, 
  BookOpen, 
  Image as ImageIcon, 
  ChevronRight, 
  Clock,
  CheckCircle2,
  Filter,
  Search
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface SiteUpdate {
  id: string;
  title: string;
  type: 'notice' | 'sermon' | 'event' | 'gallery';
  createdAt: any;
  description: string;
  link: string;
}

const NotificationView: React.FC = () => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<SiteUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'notice' | 'sermon' | 'event' | 'gallery'>('all');

  useEffect(() => {
    // We aggregate the last 20 items from multiple collections
    const collections = [
      { name: 'notices', type: 'notice', titleField: 'title', descField: 'body', link: '/dashboard/notices' },
      { name: 'sermons', type: 'sermon', titleField: 'title', descField: 'preacher', link: '/dashboard/sermons' },
      { name: 'events', type: 'event', titleField: 'title', descField: 'date', link: '/dashboard/events' },
      { name: 'gallery', type: 'gallery', titleField: (d: any) => d.type === 'vid' ? 'New Video' : 'New Photo', descField: (d: any) => 'Added to church gallery', link: '/dashboard/gallery' }
    ];

    const unsubscribes: (() => void)[] = [];
    const allResults: Record<string, SiteUpdate[]> = {};

    collections.forEach(col => {
      const q = query(collection(db, col.name), orderBy('createdAt', 'desc'), limit(10));
      const unsub = onSnapshot(q, (snapshot) => {
        allResults[col.name] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: typeof col.titleField === 'function' ? col.titleField(data) : data[col.titleField],
            description: typeof col.descField === 'function' ? col.descField(data) : data[col.descField],
            type: col.type as any,
            createdAt: data.createdAt,
            link: col.link
          };
        });
        
        // Merge and Sort
        const merged = Object.values(allResults).flat().sort((a, b) => {
          const da = a.createdAt?.toMillis() || 0;
          const db = b.createdAt?.toMillis() || 0;
          return db - da; // Descending
        });
        
        setUpdates(merged);
        setLoading(false);
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(u => u());
  }, []);

  const filtered = filter === 'all' ? updates : updates.filter(u => u.type === filter);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Activity Feed</h2>
          <p className="text-[var(--Sub)] font-medium">Stay updated with everything happening in the assembly.</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
           {(['all', 'notice', 'sermon', 'event', 'gallery'] as const).map(f => (
             <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-tac-blue text-white shadow-lg shadow-tac-blue/20' : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/10 text-gray-400 hover:border-tac-blue/30'}`}
             >
               {f}s
             </button>
           ))}
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(item.link)}
                className="group p-5 bg-white dark:bg-slate-800 rounded-[2rem] border border-[var(--Bdr)] shadow-sm hover:shadow-xl hover:border-tac-blue/20 transition-all cursor-pointer flex items-center gap-4 text-left"
              >
                  <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${
                    item.type === 'notice' ? 'bg-tac-red/10 text-tac-red' : 
                    item.type === 'sermon' ? 'bg-tac-blue/10 text-tac-blue' :
                    item.type === 'event' ? 'bg-tac-gold/10 text-tac-gold' :
                    'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  }`}>
                    {item.type === 'notice' && <Bell size={24} />}
                    {item.type === 'sermon' && <BookOpen size={24} />}
                    {item.type === 'event' && <Calendar size={24} />}
                    {item.type === 'gallery' && <ImageIcon size={24} />}
                  </div>

                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40 dark:text-white/40">{item.type}</span>
                        <div className="w-1 h-1 bg-gray-200 dark:bg-white/10 rounded-full" />
                        <span className="text-[9px] font-bold text-tac-blue/60 dark:text-tac-blue-light flex items-center gap-1">
                           <Clock size={10} />
                           {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </span>
                     </div>
                     <h3 className="text-base font-black text-tac-blue-dark dark:text-white truncate group-hover:text-tac-blue transition-colors">{item.title}</h3>
                     <p className="text-xs text-[var(--Sub)] font-medium truncate opacity-80">{item.description}</p>
                  </div>

                  <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-300 group-hover:bg-tac-blue group-hover:text-white transition-all">
                     <ChevronRight size={20} />
                  </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-4">
               <CheckCircle2 className="mx-auto text-tac-blue/10" size={64} />
               <p className="text-sm font-black uppercase tracking-widest text-gray-300">You're all caught up!</p>
            </div>
          )}
        </div>
      )}

      {!loading && updates.length > 0 && (
        <div className="pt-8 flex justify-center">
           <div className="flex items-center gap-3 text-tac-blue/20 font-black uppercase tracking-[0.3em] text-[10px]">
              <div className="w-12 h-[1px] bg-tac-blue/10" />
              End of Activity
              <div className="w-12 h-[1px] bg-tac-blue/10" />
           </div>
        </div>
      )}
    </div>
  );
};

export default NotificationView;
