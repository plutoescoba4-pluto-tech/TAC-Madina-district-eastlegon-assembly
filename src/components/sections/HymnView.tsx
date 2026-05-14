import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music4, Search, Book, Plus, X, Save, Trash2, Edit2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Hymn } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const HymnView: React.FC = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingHymn, setEditingHymn] = useState<Hymn | null>(null);
  
  const [form, setForm] = useState<Partial<Hymn>>({
    number: 0,
    title: '',
    lyrics: [''],
    chorus: '',
    category: 'Worship'
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'presbytery';

  useEffect(() => {
    const q = query(collection(db, 'hymns'), orderBy('number', 'asc'));
    const unsub = onSnapshot(q, (s) => {
      setHymns(s.docs.map(d => ({ id: d.id, ...d.data() } as Hymn)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hymns');
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHymn) {
        await updateDoc(doc(db, 'hymns', editingHymn.id), form);
      } else {
        await addDoc(collection(db, 'hymns'), form);
      }
      setIsAdding(false);
      setEditingHymn(null);
      setForm({ number: 0, title: '', lyrics: [''], chorus: '', category: 'Worship' });
    } catch (err) {
      handleFirestoreError(err, editingHymn ? OperationType.UPDATE : OperationType.CREATE, 'hymns');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hymn?')) return;
    try {
      await deleteDoc(doc(db, 'hymns', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `hymns/${id}`);
    }
  };

  const filteredHymns = hymns.filter(h => 
    h.title.toLowerCase().includes(search.toLowerCase()) || 
    h.number.toString().includes(search)
  );

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
             <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white">Church Hymnal</h2>
             {isAdmin && (
               <button 
                 onClick={() => setIsAdding(true)} 
                 className="p-2 bg-tac-blue text-white rounded-xl shadow-lg hover:rotate-90 transition-transform"
               >
                 <Plus size={20} />
               </button>
             )}
           </div>
           <p className="text-[var(--Sub)] font-medium">Digital library of {hymns.length} assembly hymns.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tac-blue/30" size={18} />
          <input 
            type="text" 
            placeholder="Search by number or title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 pr-6 py-3 bg-white dark:bg-slate-800 border border-[var(--Bdr)] rounded-2xl w-full md:w-80 outline-none focus:ring-2 focus:ring-tac-blue/5 dark:text-white"
          />
        </div>
      </header>

      {/* Add / Edit Form */}
      <AnimatePresence>
        {(isAdding || editingHymn) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-tac-blue-dark p-6 lg:p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl"
          >
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">{editingHymn ? 'Edit Hymn' : 'Add New Hymn'}</h3>
                <button 
                  onClick={() => { setIsAdding(false); setEditingHymn(null); }} 
                  className="p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={20} />
                </button>
             </div>

             <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Hymn No.</label>
                      <input 
                         type="number"
                         required
                         value={form.number}
                         onChange={e => setForm({...form, number: parseInt(e.target.value)})}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                      />
                   </div>
                   <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Title</label>
                      <input 
                         type="text"
                         required
                         value={form.title}
                         onChange={e => setForm({...form, title: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                         placeholder="Hymn Name"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Category</label>
                      <select 
                         value={form.category}
                         onChange={e => setForm({...form, category: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                      >
                         <option value="Worship">Worship</option>
                         <option value="Praise">Praise</option>
                         <option value="Youth">Youth</option>
                         <option value="Communion">Communion</option>
                         <option value="Revival">Revival</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Verses (One per line)</label>
                   <textarea 
                      required
                      value={form.lyrics?.join('\n\n')}
                      onChange={e => setForm({...form, lyrics: e.target.value.split('\n\n')})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 h-48 outline-none focus:border-white/30 font-serif"
                      placeholder="Enter lyrics here..."
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Chorus (Optional)</label>
                   <input 
                      type="text"
                      value={form.chorus}
                      onChange={e => setForm({...form, chorus: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/30"
                      placeholder="Enter chorus"
                   />
                </div>

                <button type="submit" className="w-full h-14 bg-white text-tac-blue-dark rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all">
                   <Save size={18} />
                   {editingHymn ? 'Update Hymn' : 'Add to Hymnal'}
                </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
           <div className="w-12 h-12 border-4 border-tac-blue/10 border-t-tac-blue rounded-full animate-spin" />
           <p className="text-xs font-black uppercase tracking-widest text-tac-blue/40">Opening Hymn Books...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHymns.map(hymn => (
            <details key={hymn.id} className="group bg-white dark:bg-slate-900 border border-[var(--Bdr)] rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md">
              <summary className="p-6 flex items-center justify-between cursor-pointer list-none">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue dark:text-tac-blue-light rounded-xl flex items-center justify-center font-black text-lg">
                    {hymn.number}
                  </div>
                  <div>
                    <h3 className="font-black text-tac-blue-dark dark:text-white">{hymn.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-tac-blue/40 dark:text-white/40">{hymn.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {isAdmin && (
                     <div className="flex items-center gap-2 mr-4">
                        <button 
                          onClick={(e) => { e.preventDefault(); setEditingHymn(hymn); setForm(hymn); }} 
                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-tac-blue transition-colors"
                        >
                           <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.preventDefault(); handleDelete(hymn.id); }} 
                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-tac-red transition-colors"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                   )}
                   <Book className="text-tac-blue/20 group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              <div className="px-6 pb-8 space-y-6 pt-2 border-t border-gray-50 dark:border-white/5">
                 {hymn.lyrics.map((verse, idx) => (
                   <div key={idx} className="space-y-2">
                     <p className="text-[10px] font-black text-tac-blue/20 dark:text-white/20 uppercase tracking-widest">Verse {idx + 1}</p>
                     <p className="text-lg font-serif text-tac-blue-dark dark:text-white/80 leading-relaxed whitespace-pre-line">{verse}</p>
                   </div>
                 ))}
                 {hymn.chorus && (
                   <div className="bg-tac-blue/5 dark:bg-tac-blue/10 p-6 rounded-2xl border border-tac-blue/10 dark:border-tac-blue/20">
                      <p className="text-[10px] font-black text-tac-blue italic uppercase tracking-widest mb-2 text-center">Chorus</p>
                      <p className="text-xl font-serif text-tac-blue-dark dark:text-white/90 leading-relaxed text-center italic">{hymn.chorus}</p>
                   </div>
                 )}
              </div>
            </details>
          ))}
          {filteredHymns.length === 0 && (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
               <Music4 size={48} className="mx-auto text-gray-200 dark:text-white/10 mb-4" />
               <p className="text-[var(--Sub)] font-medium">No hymns found matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HymnView;
