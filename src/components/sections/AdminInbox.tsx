import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Trash2, CheckCircle2, Clock, Mail, User, AlertTriangle, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { EmergencyMessage } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const AdminInbox: React.FC = () => {
  const [emergencies, setEmergencies] = useState<EmergencyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'resolved'>('all');

  useEffect(() => {
    const q = query(collection(db, 'emergencyRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (s) => {
      setEmergencies(s.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyMessage)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'emergencyRequests');
    });
    return unsub;
  }, []);

  const handleStatusChange = async (id: string, status: EmergencyMessage['status']) => {
    try {
      await updateDoc(doc(db, 'emergencyRequests', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'emergencyRequests');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanentely delete this request?')) return;
    try {
      await deleteDoc(doc(db, 'emergencyRequests', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'emergencyRequests');
    }
  };

  const filteredEmergencies = emergencies.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'unread') return e.status === 'unread';
    if (filter === 'resolved') return e.status === 'resolved';
    return true;
  });

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight flex items-center gap-3">
              <Shield className="text-tac-red" size={32} />
              Emergency Review Board
           </h2>
           <p className="text-[var(--Sub)] font-medium mt-1">Direct feedback and issue reports from assembly members.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
           <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
           <FilterBtn active={filter === 'unread'} onClick={() => setFilter('unread')} label="Unread" count={emergencies.filter(e => e.status === 'unread').length} />
           <FilterBtn active={filter === 'resolved'} onClick={() => setFilter('resolved')} label="Resolved" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-20">
             <RefreshCw className="animate-spin mb-4" size={48} />
             <p className="font-black uppercase tracking-[0.3em]">Connecting to board...</p>
          </div>
        ) : filteredEmergencies.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredEmergencies.map((em) => (
              <motion.div 
                key={em.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 border-2 shadow-sm transition-all relative overflow-hidden ${em.status === 'unread' ? 'border-tac-red/10' : 'border-transparent'}`}
              >
                  {em.status === 'unread' && <div className="absolute top-0 left-0 w-1.5 h-full bg-tac-red" />}
                  
                  <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                     {/* User Info */}
                     <div className="lg:w-64 shrink-0 space-y-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400">
                              <User size={24} />
                           </div>
                           <div className="min-w-0">
                              <p className="font-black text-tac-blue-dark dark:text-white truncate">{em.userName}</p>
                              <p className="text-[10px] font-bold text-gray-400 truncate">{em.userEmail}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                           <Clock size={12} />
                           {em.createdAt?.toDate?.().toLocaleString() || 'Pending...'}
                        </div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          em.status === 'unread' ? 'bg-tac-red/10 text-tac-red border border-tac-red/20' : 
                          em.status === 'read' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 
                          'bg-green-100 text-green-600 border border-green-200'
                        }`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${em.status === 'unread' ? 'bg-tac-red animate-pulse' : 'bg-current'}`} />
                           {em.status}
                        </div>
                     </div>

                     {/* Message Content */}
                     <div className="flex-1 space-y-6">
                        <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 lg:p-8 min-h-[120px] relative">
                           <AlertTriangle className="absolute top-4 right-4 text-tac-red opacity-10" size={48} />
                           <p className="text-sm lg:text-base text-[var(--Text)] dark:text-gray-300 leading-relaxed italic">
                             "{em.message}"
                           </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                           {em.status !== 'resolved' && (
                             <button 
                               onClick={() => handleStatusChange(em.id, 'resolved')}
                               className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-green-600/20 active:scale-95 transition-all"
                             >
                                <CheckCircle2 size={16} /> Resolve Request
                             </button>
                           )}
                           {em.status === 'unread' && (
                              <button 
                                onClick={() => handleStatusChange(em.id, 'read')}
                                className="flex items-center gap-2 px-6 py-3 bg-tac-blue text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-tac-blue/20 active:scale-95 transition-all"
                              >
                                 <Mail size={16} /> Mark as Read
                              </button>
                           )}
                           <button 
                             onClick={() => window.location.href = `mailto:${em.userEmail}?subject=TAC Ghana Support: Your Request`}
                             className="p-3 bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-tac-blue rounded-xl transition-all"
                           >
                              <ExternalLink size={20} />
                           </button>
                           <button 
                             onClick={() => handleDelete(em.id)}
                             className="p-3 bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-tac-red rounded-xl transition-all"
                           >
                              <Trash2 size={20} />
                           </button>
                        </div>
                     </div>
                  </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="py-20 text-center opacity-40">
             <MessageSquare className="mx-auto mb-4" size={64} />
             <p className="font-serif italic text-xl">The emergency board is clear.</p>
             <p className="text-xs font-bold uppercase tracking-widest mt-2">All members are satisfied</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterBtn: React.FC<{ active: boolean; onClick: () => void; label: string; count?: number }> = ({ active, onClick, label, count }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${active ? 'bg-tac-blue text-white shadow-lg' : 'text-gray-400 hover:text-tac-blue'}`}
  >
     {label}
     {count !== undefined && count > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${active ? 'bg-white text-tac-blue' : 'bg-tac-red text-white'}`}>{count}</span>}
  </button>
);

export default AdminInbox;
