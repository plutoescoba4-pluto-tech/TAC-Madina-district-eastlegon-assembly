import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Filter, Mail, Phone, Shield, MoreVertical, ChevronRight, ExternalLink, CheckCircle2, X, MessageSquare } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const ChurchList: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (s) => {
      setMembers(s.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsub;
  }, []);

  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.name?.toLowerCase().includes(search.toLowerCase()) || 
                          m.email?.toLowerCase().includes(search.toLowerCase()) ||
                          m.userId?.toLowerCase().includes(search.toLowerCase()) ||
                          m.phone?.includes(search));
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    // Don't show users with no name at all (incomplete auth)
    return m.name && matchesSearch && matchesRole;
  });

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { role: newRole });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${memberId}`);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black font-serif text-tac-blue-dark dark:text-white">Church Directory</h2>
          <p className="text-[var(--Sub)] font-medium">Managing {members.length} registered souls in the assembly.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white dark:bg-slate-800 border border-[var(--Bdr)] rounded-2xl w-full sm:w-64 outline-none focus:ring-2 focus:ring-tac-blue/5 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-[var(--Bdr)] rounded-2xl px-4 py-3">
            <Filter size={16} className="text-gray-400" />
            <select 
               value={roleFilter}
               onChange={(e) => setRoleFilter(e.target.value)}
               className="text-sm font-bold text-tac-blue-dark dark:text-white bg-transparent outline-none"
            >
               <option value="all">All Roles</option>
               <option value="member">Members</option>
               <option value="presbytery">Presbytery</option>
               <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
           <div className="w-12 h-12 border-4 border-tac-blue/10 border-t-tac-blue rounded-full animate-spin" />
           <p className="text-xs font-black uppercase tracking-widest text-tac-blue/40">Loading Directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredMembers.map((member, idx) => (
             <motion.div 
               key={member.id}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: idx * 0.05 }}
               onClick={() => setSelectedMember(member)}
               className="group bg-white dark:bg-slate-800 rounded-3xl p-6 border border-[var(--Bdr)] hover:border-tac-blue/20 hover:shadow-xl hover:shadow-tac-blue/5 transition-all cursor-pointer"
             >
                <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center text-xl font-black text-white ${member.color || 'bg-tac-blue'}`}>
                        {member.picUrl ? <img src={member.picUrl} className="w-full h-full object-cover rounded-2xl" /> : member.name[0]}
                     </div>
                     <div>
                        <h4 className="font-black text-tac-blue-dark dark:text-white leading-tight">{member.name}</h4>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full mt-1 inline-block ${
                          member.role === 'admin' ? 'bg-tac-red/10 text-tac-red' : 
                          member.role === 'presbytery' ? 'bg-tac-gold/10 text-tac-gold' : 
                          'bg-tac-blue/10 text-tac-blue'
                        }`}>
                          {member.role}
                        </span>
                     </div>
                   </div>
                   {member.online && <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm animate-pulse" />}
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                   <div className="flex items-center gap-3 text-xs text-[var(--Sub)] font-medium">
                      <Mail size={14} className="text-gray-300" />
                      <span className="truncate">{member.email}</span>
                   </div>
                   {member.phone && (
                     <div className="flex items-center gap-3 text-xs text-[var(--Sub)] font-medium">
                        <Phone size={14} className="text-gray-300" />
                        <span>{member.phone}</span>
                     </div>
                   )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Joined {new Date(member.joinedDate).toLocaleDateString()}</span>
                   <ChevronRight size={16} className="text-gray-200 group-hover:translate-x-1 transition-transform" />
                </div>
             </motion.div>
           ))}
        </div>
      )}

      {/* Member Details Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-tac-blue-dark/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
               <div className={`h-32 ${selectedMember.color || 'bg-tac-blue'} flex items-end justify-center pb-0`}>
                  <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl p-1 shadow-2xl translate-y-12">
                     <div className={`w-full h-full rounded-2xl flex items-center justify-center text-3xl font-black text-white ${selectedMember.color || 'bg-tac-blue'}`}>
                        {selectedMember.picUrl ? <img src={selectedMember.picUrl} className="w-full h-full object-cover rounded-2xl" /> : selectedMember.name[0]}
                     </div>
                  </div>
               </div>

               <div className="pt-16 p-8 space-y-8">
                  <div className="text-center space-y-2">
                     <h3 className="text-2xl font-black text-tac-blue-dark dark:text-white">{selectedMember.name}</h3>
                     <p className="text-[var(--Sub)] font-medium">{selectedMember.email}</p>
                     <div className="flex items-center justify-center gap-2 pt-2">
                        <span className="px-3 py-1 bg-tac-blue/5 dark:bg-tac-blue/20 text-tac-blue dark:text-tac-blue-light text-[10px] font-black uppercase tracking-widest rounded-full">{selectedMember.role}</span>
                        {selectedMember.online && <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full">Active Now</span>}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">User ID</p>
                        <p className="text-xs font-mono font-bold text-tac-blue-dark dark:text-white truncate">{selectedMember.userId || 'ID NOT SET'}</p>
                     </div>
                     <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assembly Position</p>
                        <p className="text-xs font-bold text-tac-blue-dark dark:text-white">{selectedMember.role === 'admin' ? 'System Administrator' : selectedMember.role === 'presbytery' ? 'Elder / Deacon' : 'General Member'}</p>
                     </div>
                  </div>

                  {selectedMember.uid !== user?.uid && (
                     <button 
                       onClick={() => {
                         const ids = [user?.uid, selectedMember.uid].sort();
                         const dmId = `${ids[0]}_${ids[1]}`;
                         navigate(`/dashboard/chat/direct/${dmId}`);
                       }}
                       className="w-full h-16 bg-tac-blue text-white rounded-3xl flex items-center justify-center gap-3 shadow-xl hover:scale-102 active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest"
                     >
                        <MessageSquare size={24} />
                        Chat Directly Now
                     </button>
                  )}

                   {isAdmin && (
                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/10">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Administrative Actions</p>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateRole(selectedMember.id, 'member')}
                            className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMember.role === 'member' ? 'bg-tac-blue text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                          >
                             Make Member
                          </button>
                          <button 
                            onClick={() => handleUpdateRole(selectedMember.id, 'presbytery')}
                            className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMember.role === 'presbytery' ? 'bg-tac-gold text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                          >
                             Make Presbytery
                          </button>
                          <button 
                            onClick={() => handleUpdateRole(selectedMember.id, 'admin')}
                            className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMember.role === 'admin' ? 'bg-tac-red text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                          >
                             Make Admin
                          </button>
                       </div>
                    </div>
                   )}

                   <button 
                     onClick={() => setSelectedMember(null)}
                     className="w-full h-14 border border-[var(--Bdr)] text-tac-blue-dark dark:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                   >
                     Close Profile
                   </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChurchList;
