import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollText, ShieldCheck, Heart, User, Users, Plus, X, Save, Trash2, Edit2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { ChurchConduct } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const ConductView: React.FC = () => {
  const { profile } = useAuth();
  const [conducts, setConducts] = useState<ChurchConduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingConduct, setEditingConduct] = useState<ChurchConduct | null>(null);
  
  const [form, setForm] = useState<Partial<ChurchConduct>>({
    title: '',
    points: [''],
    category: 'general'
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'presbytery';

  useEffect(() => {
    const q = query(collection(db, 'conducts'), orderBy('title', 'asc'));
    const unsub = onSnapshot(q, (s) => {
      setConducts(s.docs.map(d => ({ id: d.id, ...d.data() } as ChurchConduct)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conducts');
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        lastUpdated: serverTimestamp()
      };
      if (editingConduct) {
        await updateDoc(doc(db, 'conducts', editingConduct.id), payload);
      } else {
        await addDoc(collection(db, 'conducts'), payload);
      }
      setIsAdding(false);
      setEditingConduct(null);
      setForm({ title: '', points: [''], category: 'general' });
    } catch (err) {
      handleFirestoreError(err, editingConduct ? OperationType.UPDATE : OperationType.CREATE, 'conducts');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conduct section?')) return;
    try {
      await deleteDoc(doc(db, 'conducts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `conducts/${id}`);
    }
  };

  const handleAddPoint = () => {
    setForm({ ...form, points: [...(form.points || []), ''] });
  };

  const handleUpdatePoint = (idx: number, val: string) => {
    const newPoints = [...(form.points || [])];
    newPoints[idx] = val;
    setForm({ ...form, points: newPoints });
  };

  const handleRemovePoint = (idx: number) => {
    setForm({ ...form, points: (form.points || []).filter((_, i) => i !== idx) });
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white">Protocol & Conduct</h2>
            {isAdmin && (
              <button 
                onClick={() => setIsAdding(true)} 
                className="p-2 bg-tac-blue text-white rounded-xl shadow-lg hover:rotate-90 transition-all"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
          <p className="text-[var(--Sub)] font-medium">Core tenets and guidelines of the Assembly.</p>
        </div>
      </header>

      {/* Admin Editor Form */}
      <AnimatePresence>
        {(isAdding || editingConduct) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-tac-blue/10 dark:border-white/5 space-y-6 shadow-2xl relative z-10"
          >
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">{editingConduct ? 'Edit Conduct Section' : 'Define New Conduct Section'}</h3>
                <button onClick={() => { setIsAdding(false); setEditingConduct(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400">
                  <X size={20} />
                </button>
             </div>

             <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Section Title</label>
                      <input 
                         type="text"
                         required
                         value={form.title}
                         onChange={e => setForm({...form, title: e.target.value})}
                         className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-tac-blue/30 text-[var(--Text)]"
                         placeholder="e.g. Marriage Conduct"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ministry Category</label>
                      <select 
                         value={form.category}
                         onChange={e => setForm({...form, category: e.target.value as any})}
                         className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-tac-blue/30 text-[var(--Text)]"
                      >
                         <option value="general">General Assembly</option>
                         <option value="marriage">Marriage & Family</option>
                         <option value="youth">Youth Ministry</option>
                         <option value="protocol">Assembly Protocol</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Operational Points</label>
                   {form.points?.map((p, idx) => (
                     <div key={idx} className="flex gap-2">
                        <input 
                           type="text"
                           required
                           value={p}
                           onChange={e => handleUpdatePoint(idx, e.target.value)}
                           className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-tac-blue/30 text-sm font-medium"
                           placeholder={`Point ${idx + 1}`}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemovePoint(idx)} 
                          className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                           <X size={16} />
                        </button>
                     </div>
                   ))}
                   <button 
                    type="button" 
                    onClick={handleAddPoint}
                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-tac-blue/20 hover:text-tac-blue transition-all"
                   >
                     + Add Instruction Point
                   </button>
                </div>

                <button type="submit" className="w-full h-14 bg-tac-blue text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-tac-blue/20 active:scale-95 transition-all">
                   <Save size={18} />
                   Save Guidelines
                </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {conducts.map((section, idx) => (
          <motion.div 
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group card p-8 bg-white dark:bg-slate-900 border border-[var(--Bdr)] rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden"
          >
            {isAdmin && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { setEditingConduct(section); setForm(section); }} className="p-2 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-white/10 rounded-lg text-gray-400 hover:text-tac-blue">
                   <Edit2 size={14} />
                 </button>
                 <button onClick={() => handleDelete(section.id)} className="p-2 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-white/10 rounded-lg text-gray-400 hover:text-tac-red">
                   <Trash2 size={14} />
                 </button>
              </div>
            )}

            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-tac-blue text-white rounded-2xl flex items-center justify-center shadow-lg">
                  {section.category === 'general' && <ShieldCheck size={28} />}
                  {section.category === 'marriage' && <Heart size={28} />}
                  {section.category === 'youth' && <User size={28} />}
                  {section.category === 'protocol' && <ScrollText size={28} />}
               </div>
               <div>
                  <h3 className="text-xl font-black text-tac-blue-dark dark:text-white">{section.title}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-tac-blue/40 dark:text-white/40">{section.category} Ministry</span>
               </div>
            </div>

            <ul className="space-y-4">
               {section.points.map((point, pIdx) => (
                 <li key={pIdx} className="flex gap-3 text-sm text-[var(--Sub)] font-medium leading-relaxed">
                    <span className="w-6 h-6 shrink-0 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-full flex items-center justify-center text-[10px] font-black">
                       {pIdx + 1}
                    </span>
                    {point}
                 </li>
               ))}
            </ul>
          </motion.div>
        ))}
        {conducts.length === 0 && !loading && (
          <div className="col-span-full text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
             <ScrollText size={48} className="mx-auto text-gray-200 dark:text-white/10 mb-4" />
             <p className="text-[var(--Sub)] font-medium">No conduct guidelines established yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConductView;
