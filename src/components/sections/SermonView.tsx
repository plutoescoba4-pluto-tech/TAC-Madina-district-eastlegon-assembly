import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Play, Volume2, Calendar, User, Tag, Clock, Plus, X, Video, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Sermon } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const SermonView: React.FC = () => {
  const { profile } = useAuth();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newSermon, setNewSermon] = useState({ title: '', speaker: '', summary: '', type: 'Sunday Service', videoUrl: '', audioUrl: '' });

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("File size too large. Please keep it under 15MB for optimal performance.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewSermon({ ...newSermon, videoUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sermons'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (s) => {
      setSermons(s.docs.map(d => ({ id: d.id, ...d.data() } as Sermon)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sermons');
    });
  }, []);

  const handleAddSermon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSermon.title || !newSermon.speaker) return;

    try {
      const colors = ['bg-tac-blue', 'bg-tac-red', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600'];
      await addDoc(collection(db, 'sermons'), {
        ...newSermon,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        color: colors[Math.floor(Math.random() * colors.length)],
        createdAt: serverTimestamp()
      });
      setNewSermon({ title: '', speaker: '', summary: '', type: 'Sunday Service', videoUrl: '' });
      setIsAdding(false);
    } catch (err) {
       console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sermon?')) return;
    try {
      await deleteDoc(doc(db, 'sermons', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sermons/${id}`);
    }
  };

  const filtered = sermons.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.speaker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = profile?.role === 'admin';
  const isStaff = isAdmin || profile?.role === 'presbytery';

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Sermon Library</h2>
          <p className="text-[var(--Sub)] font-medium">Spiritual nourishment through the spoken word.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tac-blue/30" size={18} />
            <input 
              type="text" 
              placeholder="Search library..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-white dark:bg-white/5 dark:text-white border border-[var(--Bdr)] rounded-2xl w-full md:w-64 outline-none focus:ring-4 focus:ring-tac-blue/5 transition-all"
            />
          </div>
          {isStaff && (
            <button onClick={() => setIsAdding(true)} className="p-3 bg-tac-red text-white rounded-2xl shadow-lg shadow-tac-red/20 active:scale-95">
              <Plus size={20} />
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleAddSermon} className="card bg-tac-blue-dark text-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Add New Sermon</h3>
                <button type="button" onClick={() => setIsAdding(false)}><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Sermon Title" value={newSermon.title} onChange={e => setNewSermon({...newSermon, title: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <input required placeholder="Speaker Name" value={newSermon.speaker} onChange={e => setNewSermon({...newSermon, speaker: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Sermon Video (Direct Upload)</label>
                   <input type="file" accept="video/*" onChange={handleVideoUpload} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none text-xs" />
                </div>
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Or YouTube URL</label>
                   <input placeholder="https://youtube.com/..." value={newSermon.videoUrl.startsWith('data:') ? '' : newSermon.videoUrl} onChange={e => setNewSermon({...newSermon, videoUrl: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none" />
                </div>
                <select value={newSermon.type} onChange={e => setNewSermon({...newSermon, type: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none md:col-span-2">
                  <option value="Sunday Service">Sunday Service</option>
                  <option value="Wednesday Study">Bible Study</option>
                  <option value="Conference">Conference</option>
                  <option value="Special Program">Special Program</option>
                </select>
              </div>
              <textarea placeholder="Brief summary of the message..." value={newSermon.summary} onChange={e => setNewSermon({...newSermon, summary: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none min-h-[100px]" />
              <button type="submit" className="w-full py-4 bg-white text-tac-blue-dark rounded-2xl font-black shadow-lg">Upload to Library</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {filtered.map((s, i) => (
          <SermonListItem 
            key={s.id} 
            sermon={s} 
            index={i} 
            isStaff={isStaff} 
            onDelete={() => handleDelete(s.id)} 
          />
        ))}
      </div>
    </div>
  );
};

const SermonListItem: React.FC<{ sermon: Sermon; index: number; isStaff: boolean; onDelete: () => void }> = ({ sermon, index, isStaff, onDelete }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="card group hover:shadow-xl transition-all flex flex-col md:flex-row gap-6 p-6">
    <div className={`shrink-0 w-full md:w-48 aspect-video md:aspect-square rounded-2xl overflow-hidden relative shadow-lg ${sermon.color || 'bg-tac-blue'}`}>
      {sermon.videoUrl?.startsWith('data:') ? (
        <video src={sermon.videoUrl} controls className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <Play fill="white" size={32} className="text-white" />
        </div>
      )}
    </div>
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black bg-tac-blue/5 text-tac-blue px-2 py-0.5 rounded-full uppercase tracking-tighter">{sermon.type}</span>
        </div>
        <h3 className="text-xl font-black text-tac-blue-dark dark:text-white leading-tight">{sermon.title}</h3>
        <p className="text-sm text-[var(--Sub)] line-clamp-2 leading-relaxed">{sermon.summary || 'Join us for this impactful message.'}</p>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--Bdr)] pt-4 mt-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-[var(--Sub)] text-xs font-bold uppercase tracking-wider"><User size={14} className="text-tac-red" /> {sermon.speaker}</div>
          <div className="flex items-center gap-1 text-[var(--Sub)] text-xs font-bold uppercase tracking-wider"><Calendar size={14} className="text-tac-blue" /> {sermon.date}</div>
        </div>
        <div className="flex gap-2">
          {sermon.videoUrl && <a href={sermon.videoUrl} target="_blank" className="p-2.5 bg-gray-50 dark:bg-slate-700 text-tac-blue rounded-xl hover:bg-tac-blue hover:text-white transition-all"><ExternalLink size={18} /></a>}
          {isStaff && <button onClick={onDelete} className="p-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>}
        </div>
      </div>
    </div>
  </motion.div>
);

export default SermonView;
