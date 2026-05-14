import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Plus, X, Trash2, Pin, AlertTriangle, Info, Send } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Notice } from '../../types';

const NoticeView: React.FC = () => {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', body: '', type: 'gen' as Notice['type'], eventDate: '', imgUrl: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (s) => {
      setNotices(s.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
      setLoading(false);
    });
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'admin' || profile?.role === 'presbytery';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large. Please keep it under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewNotice({ ...newNotice, imgUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.body || !profile) return;

    try {
      await addDoc(collection(db, 'notices'), {
        ...newNotice,
        author: profile.name,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: serverTimestamp()
      });
      setNewNotice({ title: '', body: '', type: 'gen', eventDate: '', imgUrl: '' });
      setIsAdding(false);
    } catch (err) {
      console.error('Create notice failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-left">
          <h2 className="text-2xl lg:text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Assembly Notices</h2>
          <p className="text-[var(--Sub)] font-medium text-sm">Important updates from the Presbytery.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-tac-red text-white rounded-2xl font-bold shadow-lg shadow-tac-red/20 active:scale-95 transition-all text-xs"
          >
            <Plus size={20} />
            Post Notice
          </button>
        )}
      </header>

      {/* Add Notice Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateNotice} className="card bg-tac-blue-dark text-white space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold flex items-center gap-2"><Send size={18} /> New Broadcast</h3>
                 <button type="button" onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
               </div>
               
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Notice Title</label>
                    <input 
                      type="text" 
                      required
                      value={newNotice.title}
                      onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-white/30"
                      placeholder="e.g. Easter Celebration 2026"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Priority Level</label>
                    <select 
                      value={newNotice.type}
                      onChange={e => setNewNotice({...newNotice, type: e.target.value as Notice['type']})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-white/30"
                    >
                      <option value="gen">📋 General</option>
                      <option value="pin">📌 Pinned</option>
                      <option value="urg">⚡ Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Calendar Date (Optional)</label>
                    <input 
                      type="date" 
                      value={newNotice.eventDate}
                      onChange={e => setNewNotice({...newNotice, eventDate: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-white/30 text-white"
                    />
                  </div>
                </div>

               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Message Body</label>
                 <textarea 
                   required
                   value={newNotice.body}
                   onChange={e => setNewNotice({...newNotice, body: e.target.value})}
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 min-h-[120px] outline-none focus:border-white/30"
                   placeholder="Write notice details here..."
                 />
               </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Broadcast Image (Direct Upload)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none text-xs"
                  />
                  {newNotice.imgUrl && <img src={newNotice.imgUrl} className="mt-2 h-20 rounded-lg" alt="Preview" />}
                </div>

               <button type="submit" className="w-full py-4 bg-white text-tac-blue-dark rounded-2xl font-black shadow-xl active:scale-[0.98] transition-all">
                 Publish Broadcast Now
               </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />)
        ) : notices.length > 0 ? (
          notices.map((n, i) => (
            <NoticeItem key={n.id} notice={n} isStaff={isStaff} onDelete={() => handleDelete(n.id)} />
          ))
        ) : (
          <div className="card text-center py-20 bg-gray-50/50 border-dashed border-2">
             <Bell className="mx-auto text-tac-blue/20 mb-4" size={48} />
             <p className="text-[var(--Sub)] font-medium">No assembly notices have been posted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NoticeItem: React.FC<{ notice: Notice; isStaff: boolean; onDelete: () => void }> = ({ notice, isStaff, onDelete }) => {
  const icons = {
    pin: <Pin size={18} className="text-tac-red" />,
    urg: <AlertTriangle size={18} className="text-orange-500" />,
    gen: <Info size={18} className="text-tac-blue" />
  };

  const borders = {
    pin: 'border-l-tac-red',
    urg: 'border-l-orange-500',
    gen: 'border-l-tac-blue'
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`card border-l-4 ${borders[notice.type]} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            {icons[notice.type]}
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--Sub)]">{notice.date}</span>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black text-tac-blue-dark leading-tight dark:text-white">{notice.title}</h3>
            {notice.imgUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-black/5 bg-gray-50">
                <img src={notice.imgUrl} alt="Notice" className="w-full h-auto max-h-96 object-cover" />
              </div>
            )}
            <p className="mt-2 text-[var(--Text)] leading-relaxed whitespace-pre-wrap dark:text-gray-300">{notice.body}</p>
          </div>
        </div>
        {isStaff && (
          <button onClick={onDelete} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
            <Trash2 size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default NoticeView;
