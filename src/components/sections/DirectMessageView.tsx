import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  Smile, 
  Reply, 
  X, 
  Mic, 
  Plus, 
  Camera, 
  File, 
  MapPin,
  Trash2,
  StopCircle,
  Play,
  Video,
  CheckCheck,
  ChevronLeft,
  Music,
  Paperclip,
  Navigation
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage, UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const DirectMessageView: React.FC = () => {
  const { dmId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showBgSettings, setShowBgSettings] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  const emojis = ['🙏', '🙌', '🔥', '❤️', '⛪', '📖', '✨', '😊', '🤝', '💯', '✝️', '🕊️', '😇', '📢', '😂', '😍', '🤔', '💪', '👍', '🎁', '🎈', '🎉', '🌟', '🌈', '💧', '🌍', '⏰', '📱', '💻', '🛐', '📜', '⚖️', '🗝️'];
  const backgrounds = [
    'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png',
    'https://w0.peakpx.com/wallpaper/433/515/HD-wallpaper-whatsapp-doodle-doodles-pattern-patterns-whatsapp-background-whatsapp-doodle.jpg',
    'bg-[#efeae2]',
    'bg-gray-100',
    'bg-blue-50',
    'bg-stone-200'
  ];

  useEffect(() => {
    if (!dmId || !user) return;

    // Identify other user
    const otherUid = dmId.split('_').find(id => id !== user.uid);
    if (otherUid) {
      getDoc(doc(db, 'users', otherUid)).then(snap => {
        if (snap.exists()) setOtherUser({ uid: snap.id, ...snap.data() } as UserProfile);
      });
    }

    const q = query(
      collection(db, 'dms', dmId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `dms/${dmId}/messages`);
    });

    return () => {
      unsub();
      if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dmId, user, recordingStream]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_emojis');
    if (saved) setRecentEmojis(JSON.parse(saved));
  }, []);

  const saveEmoji = (emoji: string) => {
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji).slice(0, 7)];
    setRecentEmojis(newRecent);
    localStorage.setItem('recent_emojis', JSON.stringify(newRecent));
    setInputText(prev => prev + emoji);
    setShowEmojis(false);
  };

  const handleSendMessage = async (textOverride?: string, mediaData?: any) => {
    if (!dmId || (!textOverride && !inputText.trim() && !mediaData)) return;
    if (!user || !profile) return;

    const msgData: Partial<ChatMessage> = {
      senderId: user.uid,
      senderName: profile.name,
      text: textOverride || inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
      ...mediaData
    };

    if (replyingTo) {
      msgData.replyTo = {
        sender: replyingTo.senderName,
        ...(replyingTo.text && { text: replyingTo.text }),
        ...(replyingTo.img && { img: replyingTo.img }),
        ...(replyingTo.vid && { vid: replyingTo.vid })
      };
    }

    try {
      await addDoc(collection(db, 'dms', dmId, 'messages'), msgData);
      setInputText('');
      setReplyTo(null);
      setShowAttach(false);
      setShowEmojis(false);
    } catch (err) {
      console.error('Send failed details:', err);
      alert(`Message failed to send: ${err instanceof Error ? err.message : 'Unknown error'}`);
      handleFirestoreError(err, OperationType.CREATE, `dms/${dmId}/messages`);
    }
  };

  const handleLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        handleSendMessage(`Shared Location`, { 
          location: { lat: latitude, lng: longitude, url: locationUrl },
          text: `📍 My Location: ${locationUrl}`
        });
        setShowAttach(false);
      }, (err) => {
        alert("Unable to get location: " + err.message);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const startRecording = async (type: 'audio' | 'video' = 'audio') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' ? { facingMode: 'user' } : false 
      });
      
      setRecordingStream(stream);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          stream.getTracks().forEach(t => t.stop());
          setRecordingStream(null);
          return;
        }

        const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (type === 'video') handleSendMessage('Video Message', { vid: result });
          else handleSendMessage('Voice Message', { voice: result });
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach(t => t.stop());
        setRecordingStream(null);
      };

      recorder.start();
      if (type === 'video') setIsVideoRecording(true);
      else setIsRecording(true);
      
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      alert('Media access denied.');
    }
  };

  const stopRecording = (shouldSave = true) => {
    if (mediaRecorderRef.current && (isRecording || isVideoRecording)) {
      // If we don't want to save, we clear chunks before stopping
      if (!shouldSave) chunksRef.current = [];
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsVideoRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const takeSnapshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setIsCapturingPhoto(true);
    } catch (err) {
      alert('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (liveVideoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = liveVideoRef.current.videoWidth;
      canvas.height = liveVideoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(liveVideoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      handleSendMessage('Photo Captured', { img: dataUrl });
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCapturingPhoto(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (file.type.startsWith('image/')) handleSendMessage(`Photo: ${file.name}`, { img: result });
      else if (file.type.startsWith('video/')) handleSendMessage(`Video: ${file.name}`, { vid: result });
      else handleSendMessage(`File: ${file.name}`, { file: result });
    };
    reader.readAsDataURL(file);
    setShowAttach(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-[var(--Bdr)] z-10 shadow-sm">
            <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/5 rounded-full text-tac-blue">
                  <ChevronLeft size={24} />
               </button>
               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-lg ${otherUser?.color || 'bg-tac-blue'}`}>
                  {otherUser?.picUrl ? <img src={otherUser.picUrl} className="w-full h-full object-cover rounded-2xl" /> : otherUser?.name?.charAt(0) || '?'}
               </div>
               <div>
                  <h3 className="text-sm font-black text-tac-blue-dark dark:text-white">{otherUser?.name || 'Direct Chat'}</h3>
                  <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 text-left">
                    <div className={`w-1.5 h-1.5 rounded-full ${otherUser?.online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    {otherUser?.online ? 'Active Now' : 'Last seen recently'}
                  </div>
               </div>
            </div>
         <button onClick={() => setShowBgSettings(!showBgSettings)} className="p-2.5 text-tac-blue-dark dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all">
            <ImageIcon size={20} />
         </button>
      </div>

      {/* Background Settings */}
      <AnimatePresence>
        {showBgSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-16 right-4 bg-white rounded-3xl p-6 shadow-2xl z-[80] border border-gray-100 max-w-sm"
          >
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black uppercase text-tac-blue tracking-widest">Chat Background</h4>
                <button onClick={() => setShowBgSettings(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={16} /></button>
             </div>
             <div className="grid grid-cols-3 gap-3">
                {backgrounds.map(bg => (
                  <button 
                    key={bg} 
                    onClick={async () => {
                      if (user) {
                        try {
                          await updateDoc(doc(db, 'users', user.uid), { chatBg: bg });
                          setShowBgSettings(false);
                        } catch (err) { console.error(err); }
                      }
                    }}
                    className={`h-24 rounded-xl border-2 ${profile?.chatBg === bg ? 'border-tac-blue' : 'border-black/5'} overflow-hidden transition-all`}
                  >
                     {bg.startsWith('http') ? <img src={bg} className="w-full h-full object-cover" alt="bg" /> : <div className={`w-full h-full ${bg}`} />}
                  </button>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 lg:px-12 space-y-2 relative scroll-smooth ${profile?.chatBg?.startsWith('http') ? '' : profile?.chatBg || ''}`}
        style={profile?.chatBg?.startsWith('http') ? { backgroundImage: `url(${profile.chatBg})`, backgroundRepeat: 'repeat', backgroundSize: 'auto' } : {}}
      >
        {messages.map((msg) => (
          <DMMessageBubble 
            key={msg.id} 
            msg={msg} 
            isMe={msg.senderId === user?.uid} 
            dmId={dmId!}
          />
        ))}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900 p-2 lg:p-4 flex flex-col gap-2 relative border-t border-[var(--Bdr)] shrink-0 z-30">
         <input id="dm-file-input" type="file" className="hidden" onChange={handleFileUpload} />
         
         <AnimatePresence>
            {(isRecording || isVideoRecording || isCapturingPhoto) && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-6 text-white"
              >
                <div className="absolute top-8 left-8">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-tac-red animate-pulse">
                    {isCapturingPhoto ? 'Camera Active' : `Recording ${isVideoRecording ? 'Video' : 'Audio'}...`}
                  </h2>
                </div>

                <div className="flex-1 flex items-center justify-center w-full">
                  {(isVideoRecording || isCapturingPhoto) ? (
                    <div className="relative w-full max-w-2xl aspect-video bg-black rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                      <video 
                        ref={(el) => {
                          liveVideoRef.current = el;
                          if (el && (isCapturingPhoto || isVideoRecording)) {
                            el.srcObject = isCapturingPhoto ? cameraStream : recordingStream;
                          }
                        }} 
                        autoPlay playsInline muted className="w-full h-full object-cover" 
                      />
                      {!isCapturingPhoto && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-xl px-4 py-2 rounded-full font-mono text-2xl tracking-tighter">
                          {formatTime(recordingTime)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-8">
                      <div className="w-48 h-48 bg-tac-red rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                        <Mic size={80} className="text-white" />
                      </div>
                      <div className="text-6xl font-black tabular-nums font-mono">
                        {formatTime(recordingTime)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-8 mb-12">
                  <button 
                    onClick={isCapturingPhoto ? closeCamera : () => stopRecording(false)} 
                    className="w-20 h-20 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-full flex items-center justify-center transition-all border border-white/10"
                  >
                    <X size={32} />
                  </button>
                  <button 
                    onClick={isCapturingPhoto ? capturePhoto : () => stopRecording(true)} 
                    className={`w-24 h-24 ${isCapturingPhoto ? 'bg-tac-blue' : 'bg-tac-red'} hover:scale-110 active:scale-95 text-white rounded-full flex items-center justify-center transition-all shadow-2xl`}
                  >
                    {isCapturingPhoto ? <Camera size={48} /> : <StopCircle size={48} />}
                  </button>
                </div>
                <p className="text-sm font-medium text-white/40 uppercase tracking-widest">{isCapturingPhoto ? 'Tap camera to capture' : 'Tap stop to save and send'}</p>
              </motion.div>
            )}
          </AnimatePresence>

         {/* Attachments Menu */}
         <AnimatePresence>
           {showAttach && (
             <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 20, scale: 0.95 }}
               className="absolute bottom-20 left-4 bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-2xl z-[60] border border-gray-100 dark:border-white/10 grid grid-cols-3 gap-6"
             >
               <AttachmentOption 
                 icon={<Camera className="text-blue-500" />} 
                 label="Camera" 
                 onClick={takeSnapshot} 
               />
               <AttachmentOption 
                 icon={<ImageIcon className="text-purple-500" />} 
                 label="Gallery" 
                 onClick={() => { document.getElementById('dm-file-input')?.click(); }} 
               />
               <AttachmentOption 
                 icon={<File className="text-orange-500" />} 
                 label="Document" 
                 onClick={() => { document.getElementById('dm-file-input')?.click(); }} 
               />
               <AttachmentOption 
                 icon={<Music className="text-pink-500" />} 
                 label="Audio" 
                 onClick={() => startRecording('audio')} 
               />
               <AttachmentOption 
                 icon={<Navigation className="text-green-500" />} 
                 label="Location" 
                 onClick={handleLocation} 
               />
               <AttachmentOption 
                 icon={<Video className="text-red-500" />} 
                 label="Video Msg" 
                 onClick={() => startRecording('video')} 
               />
             </motion.div>
           )}
         </AnimatePresence>

         {/* Emoji Picker */}
         <AnimatePresence>
           {showEmojis && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[320px] bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-2xl z-[60] border border-gray-100 dark:border-white/10"
             >
               {recentEmojis.length > 0 && (
                 <div className="mb-4">
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Recently Used</p>
                   <div className="flex flex-wrap gap-2">
                      {recentEmojis.map(emoji => (
                        <button key={emoji} onClick={() => saveEmoji(emoji)} className="text-2xl p-2 hover:bg-gray-100 rounded-xl">{emoji}</button>
                      ))}
                   </div>
                 </div>
               )}
               <div className="grid grid-cols-7 gap-2 overflow-y-auto max-h-48 scrollbar-none">
                 {emojis.map(emoji => (
                   <button 
                     key={emoji} 
                     onClick={() => saveEmoji(emoji)}
                     className="text-2xl hover:bg-gray-100 dark:hover:bg-white/5 p-2 rounded-xl transition-all active:scale-90"
                   >
                     {emoji}
                   </button>
                 ))}
               </div>
             </motion.div>
           )}
         </AnimatePresence>

         <div className="flex items-center gap-2">
           <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center px-1 border border-gray-100 dark:border-white/10">
             <button onClick={() => { setShowAttach(!showAttach); setShowEmojis(false); }} className={`p-2.5 transition-colors ${showAttach ? 'text-tac-blue' : 'text-gray-500 hover:text-tac-blue'}`}><Plus size={20} /></button>
             <button onClick={() => { setShowEmojis(!showEmojis); setShowAttach(false); }} className={`p-2.5 transition-colors ${showEmojis ? 'text-tac-blue' : 'text-gray-500 hover:text-tac-blue'}`}><Smile size={20} /></button>
             <input 
               type="text" placeholder="Message" value={inputText} onChange={(e) => setInputText(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
               className="flex-1 py-3 text-sm outline-none px-1 bg-transparent dark:text-white"
             />
             <button 
               onClick={takeSnapshot}
               className="p-2.5 text-gray-400 hover:text-tac-blue transition-all"
             >
               <Camera size={20} />
             </button>
             {!inputText.trim() && (
               <button 
                 type="button" 
                 onClick={() => startRecording('video')}
                 className="p-2.5 text-gray-400 hover:text-tac-red transition-all"
               >
                 <Video size={20} />
               </button>
             )}
           </div>
           <button 
             onClick={inputText.trim() ? () => handleSendMessage() : (isRecording || isVideoRecording) ? () => stopRecording(true) : () => startRecording()}
             className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${inputText.trim() ? 'bg-tac-blue' : 'bg-tac-blue-dark'} text-white transition-all hover:scale-105 active:scale-95`}
           >
             {inputText.trim() ? <Send size={20} /> : (isRecording || isVideoRecording) ? <StopCircle size={20} /> : <Mic size={20} />}
           </button>
         </div>
      </div>
    </div>
  );
};

const AttachmentOption: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all shadow-sm border border-gray-100 dark:border-white/5">
      {React.cloneElement(icon as React.ReactElement, { size: 24 })}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-tac-blue transition-colors">{label}</span>
  </button>
);

const DMMessageBubble: React.FC<{ msg: ChatMessage; isMe: boolean; dmId: string }> = ({ msg, isMe, dmId }) => {
  const { profile } = useAuth();
  const [showOptions, setShowOptions] = useState(false);

  const handleDelete = async () => {
    // participants are allowed to delete in DMs
    if (confirm('Delete this message?')) {
      try {
        await deleteDoc(doc(db, 'dms', dmId, 'messages', msg.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `dms/${dmId}/messages/${msg.id}`);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowOptions(true);
      }}
      onClick={() => setShowOptions(true)}
      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group mb-1 cursor-pointer`}
    >
      <div className={`relative max-w-[85%] lg:max-w-2xl px-2.5 py-1.5 rounded-xl shadow-sm ${isMe ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none' : 'bg-white dark:bg-[#202c33] rounded-tl-none border border-black/5 dark:border-none'}`}>
        
        {/* Actions on Hover */}
        <div className={`absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isMe ? '-left-10' : '-right-10'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-1.5 bg-white/90 dark:bg-slate-800 backdrop-blur rounded-full shadow-lg text-tac-red"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Mobile/Click Options Overlay */}
        <AnimatePresence>
          {showOptions && (
            <div 
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20"
              onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-2 shadow-2xl min-w-[160px] border border-gray-100 dark:border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => { handleDelete(); setShowOptions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all text-tac-red"
                >
                  <Trash2 size={18} />
                  <span className="text-sm font-black">Delete Message</span>
                </button>
                <button 
                  onClick={() => setShowOptions(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all text-gray-400"
                >
                  <X size={18} />
                  <span className="text-sm font-bold">Cancel</span>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {msg.img && (
          <div className="mb-2 rounded-lg overflow-hidden bg-white">
             <img src={msg.img} alt="media" className="w-full max-h-80 object-cover" />
          </div>
        )}

        {msg.vid && (
          <div className="mb-2 rounded-lg overflow-hidden bg-black aspect-video max-w-sm">
            <video src={msg.vid} controls className="w-full h-full object-contain" />
          </div>
        )}

        {msg.voice && (
          <div className="mb-2 p-2 bg-white/10 rounded-xl">
             <audio src={msg.voice} controls className="w-full h-8" />
          </div>
        )}

        {msg.location && (
          <a 
            href={msg.location.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mb-2 block rounded-xl overflow-hidden bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800"
          >
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <MapPin size={20} />
              </div>
              <div>
                <div className="text-[12px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Shared Location</div>
                <div className="text-[10px] text-blue-400 line-clamp-1">Open in Google Maps</div>
              </div>
            </div>
          </a>
        )}

        <div className="text-[14px] text-[#111b21] dark:text-slate-200 leading-[19px] break-words pr-14 min-h-[1.25rem] text-left">
          {msg.text}
        </div>

        <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
          <span className="text-[9px] text-[#667781] leading-none mb-0.5">{msg.time}</span>
          {isMe && <CheckCheck size={12} className="text-[#53bdeb]" />}
        </div>
      </div>
    </motion.div>
  );
};

export default DirectMessageView;
