import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Plus, X, Trash2, Send, CheckCircle2, Clock, 
  AlertTriangle, Image as ImageIcon, FileText, 
  ChevronRight, Bell, Share2, Edit3, MessageSquare,
  User, Pin, Info, Sparkles
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { UpdateRequest } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5 shrink-0">
     <span className="text-[7px] font-black uppercase tracking-widest text-gray-400">{label}</span>
     <span className={`text-xs font-black ${color}`}>{value}</span>
  </div>
);

const UpdateView: React.FC = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', body: '', type: 'gen' as UpdateRequest['type'] });
  const [newRequest, setNewRequest] = useState({ title: '', body: '', type: 'gen' as UpdateRequest['type'], imgUrl: '', fileUrl: '' });
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'admin';
  const isPresbytery = profile?.role === 'presbytery';

  useEffect(() => {
    if (!profile) return;
    
    let q = query(collection(db, 'updateRequests'), orderBy('createdAt', 'desc'));
    if (isPresbytery && !isAdmin) {
      q = query(collection(db, 'updateRequests'), where('authorId', '==', profile.uid), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (s) => {
      setRequests(s.docs.map(d => ({ id: d.id, ...d.data() } as UpdateRequest)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'updateRequests');
    });

    return unsub;
  }, [profile, isAdmin, isPresbytery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'img' | 'file') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Please keep it under 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'img') {
          setNewRequest({ ...newRequest, imgUrl: event.target?.result as string });
        } else {
          setNewRequest({ ...newRequest, fileUrl: event.target?.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.title || !newRequest.body || !profile) return;

    try {
      await addDoc(collection(db, 'updateRequests'), {
        ...newRequest,
        authorId: profile.uid,
        authorName: profile.name,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setNewRequest({ title: '', body: '', type: 'gen', imgUrl: '', fileUrl: '' });
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'updateRequests');
    }
  };

  const startEditing = (req: UpdateRequest) => {
    setEditingId(req.id);
    setEditData({ title: req.title, body: req.body, type: req.type });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateDoc(doc(db, 'updateRequests', editingId), {
        ...editData
      });
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'updateRequests');
    }
  };

  const handleExportToNotices = async (req: UpdateRequest) => {
    if (!isAdmin) return;
    try {
      // Use latest current data from state/editData if currently editing, otherwise use req
      const finalTitle = editingId === req.id ? editData.title : req.title;
      const finalBody = editingId === req.id ? editData.body : req.body;
      const finalType = editingId === req.id ? editData.type : req.type;

      await addDoc(collection(db, 'notices'), {
        title: finalTitle,
        body: finalBody,
        type: finalType,
        imgUrl: req.imgUrl || '',
        author: req.authorName,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'updateRequests', req.id), {
        status: 'exported'
      });
      
      setEditingId(null);
      alert("Notice broadcasted successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notices');
    }
  };

  const handleStatusChange = async (id: string, status: UpdateRequest['status']) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'updateRequests', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'updateRequests');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this request permanentely?')) return;
    try {
      await deleteDoc(doc(db, 'updateRequests', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'updateRequests');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Header - Ultra Condensed */}
      <div className="p-1.5 lg:px-3 border-b border-[var(--Bdr)] bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm z-10 shrink-0">
         <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-tac-blue/10 rounded-lg flex items-center justify-center text-tac-blue">
               <Zap className="fill-tac-blue/10" size={14} />
            </div>
            <div>
               <h2 className="text-[11px] font-black text-tac-blue-dark dark:text-white uppercase tracking-tight">Stream</h2>
            </div>
         </div>
         
         {isPresbytery && (
           <button 
             onClick={() => setIsAdding(true)}
             className="flex items-center gap-1.5 px-2.5 py-1 bg-tac-blue text-white rounded-md font-black uppercase tracking-widest text-[8px] shadow-sm hover:bg-tac-blue-dark transition-all"
           >
             <Plus size={10} />
             Add
           </button>
         )}
      </div>

      {/* Info Stats - Ultra Condensed Row */}
      <div className="flex items-center gap-1.5 p-1.5 lg:px-3 bg-white/50 dark:bg-slate-900/50 border-b border-[var(--Bdr)] no-scrollbar shrink-0">
         <StatItem label="Pending" value={requests.filter(r => r.status === 'pending').length} color="text-tac-blue" />
         <StatItem label="Live" value={requests.filter(r => r.status === 'exported').length} color="text-green-500" />
         <StatItem label="Urgent" value={requests.filter(r => r.type === 'urg').length} color="text-tac-red" />
      </div>

      {/* Message Feed */}
      <div 
        className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scroll-smooth custom-scrollbar"
        ref={scrollRef}
      >
        <AnimatePresence>
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-300">
                <Sparkles className="animate-spin" size={32} />
                <span className="font-black uppercase tracking-widest text-xs">Loading Channel...</span>
             </div>
          ) : requests.length > 0 ? (
            requests.map((r) => (
              <TimelineItem 
                key={r.id} 
                request={r} 
                isAdmin={isAdmin} 
                isEditing={editingId === r.id}
                editData={editData}
                onSetEditData={setEditData}
                onStartEdit={() => startEditing(r)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
                onExport={() => handleExportToNotices(r)}
                onStatus={(status) => handleStatusChange(r.id, status)}
                onDelete={() => handleDelete(r.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
               <MessageSquare size={64} className="mb-4 text-gray-400" />
               <p className="font-serif italic text-lg text-tac-blue-dark dark:text-white">The board is clear. No update requests pending.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Overlay for adding */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
             <motion.div 
               initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
               className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 md:p-8 border-2 border-tac-blue/10 overflow-hidden"
             >
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-black text-tac-blue-dark dark:text-white uppercase tracking-tight">New Update Request</h3>
                   <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={24} />
                   </button>
                </div>

                <form onSubmit={handleSubmitRequest} className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        required placeholder="Broadcast Title"
                        value={newRequest.title} onChange={e => setNewRequest({...newRequest, title: e.target.value})}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-tac-blue rounded-xl px-6 outline-none transition-all"
                      />
                      <select 
                        value={newRequest.type} onChange={e => setNewRequest({...newRequest, type: e.target.value as UpdateRequest['type']})}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-tac-blue rounded-xl px-6 outline-none appearance-none cursor-pointer"
                      >
                         <option value="gen">📋 General Update</option>
                         <option value="urg">⚡ Urgent</option>
                         <option value="pin">📌 Pinned</option>
                      </select>
                   </div>
                   <textarea 
                     required placeholder="Your message content..."
                     value={newRequest.body} onChange={e => setNewRequest({...newRequest, body: e.target.value})}
                     className="w-full min-h-[150px] bg-gray-50 dark:bg-white/5 border border-transparent focus:border-tac-blue rounded-2xl p-6 outline-none transition-all resize-none"
                   />
                   <div className="flex flex-wrap gap-4">
                      <button type="button" className="relative group flex items-center gap-2 px-4 h-12 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-tac-blue border border-transparent hover:border-tac-blue transition-all">
                        <ImageIcon size={16} />
                        {newRequest.imgUrl ? 'Image Loaded' : 'Attach Poster'}
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'img')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </button>
                      <button type="button" className="relative group flex items-center gap-2 px-4 h-12 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-tac-blue border border-transparent hover:border-tac-blue transition-all">
                        <FileText size={16} />
                        {newRequest.fileUrl ? 'File Ready' : 'Attach Document'}
                        <input type="file" onChange={e => handleFileUpload(e, 'file')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </button>
                   </div>
                   <button type="submit" className="w-full h-16 bg-tac-blue text-white rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-tac-blue/20 hover:scale-[1.01] active:scale-[0.98] transition-all">
                      Send to Admin Review
                   </button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TimelineItem: React.FC<{ 
  request: UpdateRequest; 
  isAdmin: boolean;
  isEditing: boolean;
  editData: { title: string; body: string; type: UpdateRequest['type'] };
  onSetEditData: (d: any) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onExport: () => void;
  onStatus: (s: UpdateRequest['status']) => void;
  onDelete: () => void;
}> = ({ request, isAdmin, isEditing, editData, onSetEditData, onStartEdit, onSaveEdit, onCancelEdit, onExport, onStatus, onDelete }) => {
  const statusColors = {
    pending: 'text-orange-500 bg-orange-50 border-orange-100',
    exported: 'text-green-500 bg-green-50 border-green-100',
    rejected: 'text-red-500 bg-red-50 border-red-100'
  };

  const typeIcons = {
    gen: <Info size={14} />,
    urg: <AlertTriangle size={14} />,
    pin: <Pin size={14} />
  };

  const typeColors = {
    gen: 'text-blue-500 bg-blue-50',
    urg: 'text-red-500 bg-red-50',
    pin: 'text-purple-500 bg-purple-50'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`relative w-full max-w-4xl mx-auto flex gap-4 ${request.authorName.toLowerCase().includes('admin') ? 'flex-row-reverse' : ''}`}
    >
       {/* Avatar Circle */}
       <div className={`hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center shrink-0 shadow-sm ${typeColors[request.type]}`}>
          <User size={20} />
       </div>

       {/* Message Bubble */}
       <div className={`flex-1 group bg-white dark:bg-slate-900 rounded-[2rem] p-6 lg:p-8 border border-[var(--Bdr)] shadow-sm hover:shadow-xl transition-all relative ${isEditing ? 'ring-2 ring-tac-blue border-transparent' : ''}`}>
          
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                <span className="font-black text-[10px] uppercase tracking-widest text-tac-blue-dark dark:text-white">{request.authorName}</span>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors[request.status]}`}>
                   {request.status}
                </span>
                {request.type !== 'gen' && (
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${typeColors[request.type]}`}>
                     {typeIcons[request.type]}
                     {request.type === 'urg' ? 'Urgent' : 'Pinned'}
                  </span>
                )}
             </div>
             <span className="text-[10px] font-bold text-gray-300">
                {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending...'}
             </span>
          </div>

          {isEditing ? (
             <div className="space-y-4">
                <input 
                  value={editData.title} onChange={e => onSetEditData({...editData, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-white/5 p-3 rounded-xl font-bold outline-none border border-tac-blue/20"
                />
                <textarea 
                  value={editData.body} onChange={e => onSetEditData({...editData, body: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-white/5 p-4 rounded-xl text-sm min-h-[100px] outline-none border border-tac-blue/20"
                />
                <div className="flex gap-2">
                   <button onClick={onSaveEdit} className="bg-green-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Apply Changes</button>
                   <button onClick={onCancelEdit} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Discard</button>
                </div>
             </div>
          ) : (
            <div className="space-y-3">
               <h3 className="text-lg font-black text-tac-blue-dark dark:text-white leading-tight">{request.title}</h3>
               <p className="text-sm text-[var(--Text)] dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{request.body}</p>
            </div>
          )}

          {request.imgUrl && !isEditing && (
            <div className="mt-4 rounded-2xl overflow-hidden border border-black/5">
               <img src={request.imgUrl} className="w-full object-cover max-h-[400px]" alt="Update attachment" />
            </div>
          )}

          {/* Action Overlay (Floating Toolbar) */}
          <div className="mt-6 flex flex-wrap items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
             {isAdmin && request.status === 'pending' && !isEditing && (
               <>
                 <button 
                   onClick={onExport}
                   className="flex items-center gap-2 px-5 py-2.5 bg-tac-blue text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-md"
                 >
                    <CheckCircle2 size={14} />
                    Export to Notices
                 </button>
                 <button onClick={onStartEdit} className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-400 hover:text-tac-blue transition-all">
                    <Edit3 size={18} />
                 </button>
                 <button onClick={() => onStatus('rejected')} className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-400 hover:text-tac-red transition-all">
                    <X size={18} />
                 </button>
               </>
             )}
             
             {isEditing && isAdmin && (
                <button 
                  onClick={onExport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                   <Send size={14} />
                   Save & Live Post
                </button>
             )}

             <button onClick={onDelete} className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-300 hover:text-tac-red transition-all ml-auto">
                <Trash2 size={18} />
             </button>
          </div>

          {/* Status Indicators for non-admins */}
          {!isAdmin && (
             <div className="absolute -bottom-3 -right-3">
                <div className={`w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg ${statusColors[request.status]}`}>
                   {request.status === 'exported' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                </div>
             </div>
          )}
       </div>
    </motion.div>
  );
};

export default UpdateView;
