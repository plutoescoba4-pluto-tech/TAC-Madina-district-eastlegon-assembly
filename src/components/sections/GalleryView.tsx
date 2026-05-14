import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Video, Plus, X, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { GalleryItem } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const GalleryView: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (s) => {
      setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
    });
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isMediaMentor = profile?.teams?.media === 'mentor';
  const canManage = isAdmin || isMediaMentor;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this from the gallery?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleUpload = () => {
    if (!canManage) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const result = event.target?.result as string;
          const type = file.type.startsWith('video/') ? 'vid' : 'img';
          try {
            await addDoc(collection(db, 'gallery'), {
              src: result,
              type,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'gallery');
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black font-serif text-tac-blue-dark dark:text-white tracking-tight">Church Gallery</h2>
          <p className="text-[var(--Sub)] font-medium text-sm">Capturing moments of worship and community.</p>
        </div>
        {canManage && (
          <button 
            onClick={handleUpload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-tac-blue text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-tac-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={16} />
            Post to Gallery
          </button>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
              >
                {item.type === 'vid' ? (
                  <video src={item.src} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.src} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
                
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   {item.type === 'vid' ? <Video className="text-white" size={32} /> : <ImageIcon className="text-white" size={32} />}
                </div>

                {canManage && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 active:scale-95"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card text-center py-20 bg-gray-50/50 dark:bg-slate-900/50 border-dashed border-2 border-[var(--Bdr)]">
           <ImageIcon className="mx-auto text-tac-blue/20 mb-4" size={48} />
           <p className="text-[var(--Sub)] font-medium">The gallery is currently empty.</p>
        </div>
      )}
    </div>
  );
};

export default GalleryView;
