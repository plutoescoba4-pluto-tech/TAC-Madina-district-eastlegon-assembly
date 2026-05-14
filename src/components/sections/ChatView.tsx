import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  Smile, 
  MoreVertical, 
  Reply, 
  X, 
  Mic, 
  Plus, 
  Camera, 
  File, 
  User,
  Check,
  CheckCheck,
  MapPin,
  Trash2,
  StopCircle,
  Play,
  Video,
  RotateCcw
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const ChatView: React.FC = () => {
  const { user, profile } = useAuth();
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
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showBgSettings, setShowBgSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  // Categorized Emojis
  const emojiCategories = [
    { label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'] },
    { label: 'Religious', emojis: ['🙏', '🙌', '⛪', '📖', '✝️', '🕊️', '😇', '✨', '👑', '🌈', '💎', '💡', '🔔', '💒', '🕍', '🕋', '🕌', '🕯️', '📿', '🧿', '☀️', '⭐', '🌙'] },
    { label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'] },
    { label: 'Hands', emojis: ['👏', '🙌', '👐', '🤲', '🤝', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '🖐️', '✋', '🖖', '👋', '🤙', '💪'] },
    { label: 'Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹'] }
  ];
  const [activeCategory, setActiveCategory] = useState(0);

  const backgrounds = [
    'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png',
    'https://w0.peakpx.com/wallpaper/433/515/HD-wallpaper-whatsapp-doodle-doodles-pattern-patterns-whatsapp-background-whatsapp-doodle.jpg',
    'bg-[#efeae2]',
    'bg-gray-100',
    'bg-blue-50',
    'bg-stone-200'
  ];

  useEffect(() => {
    const q = query(
      collection(db, 'chats', 'global', 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats/global/messages');
    });

    return () => {
      unsub();
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cameraStream, recordingStream]);

  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  useEffect(() => {
    if (isVideoRecording && recordingStream && liveVideoRef.current) {
      liveVideoRef.current.srcObject = recordingStream;
    }
  }, [isVideoRecording, recordingStream]);

  const handleSendMessage = async (textOverride?: string, mediaData?: any) => {
    if (!textOverride && !inputText.trim() && !mediaData) return;
    if (!user || !profile) return;

    const msgData: Partial<ChatMessage> = {
      senderId: user.uid,
      senderName: profile.name,
      senderColor: profile.color || 'bg-tac-blue',
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
      await addDoc(collection(db, 'chats', 'global', 'messages'), msgData);
      setInputText('');
      setReplyTo(null);
      setShowAttach(false);
      setShowEmojis(false);
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      console.error('Camera failed:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      stopCamera();
      handleSendMessage("Captured a photo", { img: dataUrl });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
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

      recorder.onstop = () => {
        const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        if (type === 'video') {
          setVideoBlob(blob);
          setVideoUrl(url);
          setShowVideoPreview(true);
        } else {
          setAudioBlob(blob);
          setAudioUrl(url);
          setShowAudioPreview(true);
        }
        stream.getTracks().forEach(t => t.stop());
        setRecordingStream(null);
      };

      recorder.start();
      if (type === 'video') {
        setIsVideoRecording(true);
      } else {
        setIsRecording(true);
      }
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      alert('Media access denied.');
    }
  };

  const stopRecording = (shouldSave = true) => {
    if (mediaRecorderRef.current && (isRecording || isVideoRecording)) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsVideoRecording(false);
      if (recordingStream) {
        recordingStream.getTracks().forEach(t => t.stop());
        setRecordingStream(null);
      }
      clearInterval(timerRef.current);
      if (!shouldSave) {
        setAudioUrl(null);
        setAudioBlob(null);
        setShowAudioPreview(false);
        setVideoUrl(null);
        setVideoBlob(null);
        setShowVideoPreview(false);
      }
    }
  };

  const handleSendAudio = async () => {
    if (!audioUrl || !audioBlob) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      handleSendMessage("🎤 Voice message", { audio: base64 });
      setAudioUrl(null);
      setAudioBlob(null);
      setShowAudioPreview(false);
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleSendVideo = async () => {
    if (!videoUrl || !videoBlob) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      handleSendMessage("📹 Video message", { vid: base64 });
      setVideoUrl(null);
      setVideoBlob(null);
      setShowVideoPreview(false);
    };
    reader.readAsDataURL(videoBlob);
  };

  const handleLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        handleSendMessage("📍 Shared my location", { location: mapUrl });
      }, (err) => {
        console.error(err);
        alert("Could not get location. Ensure GPS is on.");
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (file.type.startsWith('image/')) {
        handleSendMessage(`Shared photo: ${file.name}`, { img: result });
      } else if (file.type.startsWith('video/')) {
        handleSendMessage(`Shared video: ${file.name}`, { vid: result });
      } else {
        handleSendMessage(`Shared file: ${file.name}`, { file: result });
      }
    };
    reader.readAsDataURL(file);
    setShowAttach(false);
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAttach = (type: string) => {
    if (type === 'camera') {
      startCamera();
    } else if (type === 'location') {
      handleLocation();
    } else if (type === 'file' || type === 'image') {
      document.getElementById('file-input')?.click();
    }
    setShowAttach(false);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden font-sans">
      {/* Background Settings */}
      <AnimatePresence>
        {showBgSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-16 right-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl z-[80] border border-gray-100 dark:border-white/10 max-w-sm"
          >
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black uppercase text-tac-blue tracking-widest">Chat Background</h4>
                <button onClick={() => setShowBgSettings(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"><X size={16} className="dark:text-white" /></button>
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
                        } catch (err) {
                           console.error(err);
                        }
                      }
                    }}
                    className={`h-24 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${profile?.chatBg === bg ? 'border-tac-blue' : 'border-black/5'} overflow-hidden`}
                  >
                     {bg.startsWith('http') ? (
                       <img src={bg} className="w-full h-full object-cover" alt="bg" />
                     ) : (
                       <div className={`w-full h-full ${bg}`} />
                     )}
                  </button>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-[var(--Bdr)] shrink-0 z-30 shadow-sm">
         <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-lg ${profile?.color || 'bg-tac-blue'}`}>
               {profile?.name.charAt(0)}
            </div>
            <div>
               <h3 className="text-sm font-black text-tac-blue-dark dark:text-white leading-tight">Assembly Fellowship</h3>
               <div className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 Connected Online
               </div>
            </div>
         </div>
         <div className="flex items-center gap-1">
           <button onClick={() => setShowBgSettings(!showBgSettings)} className="p-2.5 text-tac-blue-dark dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all">
              <ImageIcon size={20} />
           </button>
         </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 lg:px-12 space-y-2 relative scroll-smooth ${profile?.chatBg?.startsWith('http') ? '' : profile?.chatBg || ''}`}
        style={profile?.chatBg?.startsWith('http') ? { backgroundImage: `url(${profile.chatBg})`, backgroundRepeat: 'repeat', backgroundSize: 'auto' } : {}}
      >
        <div className="flex justify-center mb-6">
           <span className="px-4 py-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-lg text-[10px] uppercase font-black text-tac-blue tracking-[0.2em] border border-tac-blue/5">Church Global Fellowship</span>
        </div>

        {messages.map((msg, i) => (
          <MessageBubble 
            key={msg.id} 
            msg={msg} 
            isMe={msg.senderId === user?.uid} 
            onReply={() => setReplyTo(msg)}
          />
        ))}
      </div>

      {/* Emoji Picker Overlay */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div 
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-[#111b21] z-[120] flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.1)] h-[350px]"
          >
            <div className="flex bg-gray-100 dark:bg-[#202c33] shrink-0 border-b border-black/5 dark:border-white/5 overflow-x-auto scrollbar-hide">
              {emojiCategories.map((cat, idx) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(idx)}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === idx ? 'text-tac-blue bg-white dark:bg-[#111b21] border-b-2 border-tac-blue' : 'text-gray-400'}`}
                >
                  {cat.label}
                </button>
              ))}
              <button onClick={() => setShowEmojis(false)} className="ml-auto px-4 text-gray-400 group"><X size={18} className="group-hover:rotate-90 transition-transform" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-7 sm:grid-cols-9 lg:grid-cols-12 gap-y-4">
              {emojiCategories[activeCategory].emojis.map(e => (
                <button key={e} onClick={() => addEmoji(e)} className="text-3xl hover:scale-125 transition-transform p-1 flex justify-center items-center">
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-white/10 flex items-center gap-3"
          >
            <div className="flex-1 bg-gray-50 dark:bg-white/5 border-l-4 border-tac-blue rounded-lg p-2 text-xs text-left">
               <p className="font-bold text-tac-blue">{replyingTo.senderName}</p>
               <p className="text-gray-500 dark:text-gray-400 truncate">{replyingTo.text || 'Media Message'}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
              <X size={18} className="text-gray-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Panel */}
      <AnimatePresence>
        {showAttach && (
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl grid grid-cols-3 gap-6 z-50 border border-gray-100 dark:border-white/10"
          >
             <AttachBtn onClick={() => handleAttach('image')} icon={<ImageIcon size={24} />} label="Gallery" color="bg-purple-500" />
             <AttachBtn onClick={() => handleAttach('camera')} icon={<Camera size={24} />} label="Camera" color="bg-red-500" />
             <AttachBtn onClick={() => handleAttach('file')} icon={<File size={24} />} label="Document" color="bg-blue-500" />
             <AttachBtn onClick={() => handleAttach('location')} icon={<MapPin size={24} />} label="Location" color="bg-green-500" />
             <AttachBtn onClick={() => startRecording('audio')} icon={<Mic size={24} />} label="Audio Rec" color="bg-orange-500" />
             <AttachBtn onClick={() => startRecording('video')} icon={<Video size={24} />} label="Video Rec" color="bg-red-600" />
             <button onClick={() => setShowAttach(false)} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center"><X size={24} /></div>
                <span className="text-[10px] font-black uppercase text-gray-400">Close</span>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Recording Preview Overlay */}
      <AnimatePresence>
        {showAudioPreview && audioUrl && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-0 inset-x-0 bg-[#f0f2f5] dark:bg-[#111b21] z-[60] border-t border-gray-200 dark:border-white/10 p-4"
          >
             <div className="bg-white dark:bg-[#202c33] rounded-3xl p-4 shadow-xl flex items-center gap-4">
                <button 
                  onClick={() => {
                    const audio = new Audio(audioUrl);
                    audio.play();
                  }}
                  className="w-12 h-12 bg-tac-blue text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                  <Play size={24} />
                </button>
                <div className="flex-1">
                   <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-tac-blue animate-progress" />
                   </div>
                   <p className="text-[10px] font-black uppercase text-tac-blue tracking-widest mt-2">Preview Voice Message</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioBlob(null);
                      setShowAudioPreview(false);
                    }}
                    className="p-3 text-tac-red hover:bg-tac-red/5 rounded-full transition-colors"
                  >
                    <Trash2 size={24} />
                  </button>
                  <button 
                    onClick={handleSendAudio}
                    className="w-12 h-12 bg-[#005c4b] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                  >
                    <Send size={24} />
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Recording Preview Overlay */}
      <AnimatePresence>
        {showVideoPreview && videoUrl && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-0 inset-x-0 bg-black z-[70] p-4"
          >
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-4">
                <video src={videoUrl} controls className="w-full aspect-video rounded-2xl bg-black" />
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => {
                      setVideoUrl(null);
                      setVideoBlob(null);
                      setShowVideoPreview(false);
                    }}
                    className="p-3 text-tac-red hover:bg-tac-red/5 rounded-full transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
                  >
                    <Trash2 size={24} />
                    Discard
                  </button>
                  <button 
                    onClick={handleSendVideo}
                    className="h-14 px-8 bg-[#005c4b] text-white rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest"
                  >
                    <Send size={24} />
                    Send Video Message
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 p-2 lg:p-4 flex flex-col gap-2 relative border-t border-[var(--Bdr)] shrink-0 z-30">
        <input 
          id="file-input" 
          type="file" 
          className="hidden" 
          onChange={handleFileUpload}
        />

        <AnimatePresence>
          {(isRecording || isVideoRecording) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[150] flex flex-col"
            >
              {isVideoRecording ? (
                <div className="flex-1 relative bg-black">
                  <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute top-0 inset-x-0 p-8 flex justify-between bg-gradient-to-b from-black/60 to-transparent text-white">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                       <span className="font-black text-xl tabular-nums">{formatTime(recordingTime)}</span>
                    </div>
                    <button onClick={() => stopRecording(false)} className="p-2 bg-black/20 backdrop-blur-md rounded-full"><X size={24} /></button>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-12 flex justify-center bg-gradient-to-t from-black/60 to-transparent">
                     <button 
                        onClick={() => stopRecording(true)}
                        className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full p-2 border-4 border-white flex items-center justify-center group"
                     >
                        <div className="w-full h-full bg-red-500 rounded-full group-active:scale-90 transition-transform" />
                     </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b141a]">
                  <div className="w-32 h-32 bg-tac-red rounded-full flex items-center justify-center shadow-2xl shadow-tac-red/50 mb-8 animate-pulse text-white">
                    <Mic size={48} />
                  </div>
                  <h3 className="text-4xl font-black text-white tabular-nums mb-2">{formatTime(recordingTime)}</h3>
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Recording Voice Message</p>
                  
                  <div className="fixed bottom-12 inset-x-0 flex justify-center gap-4 px-8 max-w-lg mx-auto w-full">
                     <button 
                      onClick={() => stopRecording(false)}
                      className="h-16 px-8 bg-white/5 border border-white/10 text-white rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-2"
                     >
                       <X size={18} /> Cancel
                     </button>
                     <button 
                      onClick={() => stopRecording(true)}
                      className="h-16 flex-1 bg-tac-red text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-tac-red/20 flex items-center justify-center gap-2"
                     >
                       <Send size={18} /> Stop & Send
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            type="button" 
            onClick={() => setShowAttach(!showAttach)}
            className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all shrink-0 ${showAttach ? 'rotate-45 text-tac-red' : ''}`}
          >
            <Plus size={24} />
          </button>

          <div className="flex-1 bg-white dark:bg-white/10 rounded-2xl flex items-center px-1 shadow-sm transition-shadow focus-within:shadow-md border border-gray-100 dark:border-white/10 min-w-0">
            <button 
              type="button" 
              onClick={() => setShowEmojis(!showEmojis)}
              className={`p-2 sm:p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full shrink-0 ${showEmojis ? 'text-tac-blue' : ''}`}
             >
                <Smile size={24} />
             </button>

            <input 
              type="text" 
              placeholder="Message" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 py-3 sm:py-4 text-sm sm:text-base outline-none px-2 text-[#111b21] dark:text-white bg-transparent placeholder:text-gray-400 min-w-0"
            />
            
            {!inputText.trim() && (
              <button type="button" onClick={() => handleAttach('camera')} className="p-2 sm:p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full shrink-0">
                <Camera size={24} />
              </button>
            )}
          </div>
          
          <button 
            type="button"
            onClick={inputText.trim() ? () => handleSendMessage() : isRecording ? () => stopRecording(true) : () => startRecording('audio')}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0 ${inputText.trim() ? 'bg-tac-blue text-white' : isRecording ? 'bg-tac-red text-white shadow-tac-red/30' : 'bg-[#005c4b] text-white'}`}
          >
            {inputText.trim() ? (
              <Send size={18} className="sm:w-5 sm:h-5" />
            ) : isRecording ? (
              <StopCircle size={24} className="animate-pulse" />
            ) : (
              <Mic size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Camera Modal Overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md absolute top-0 w-full z-10 text-white">
              <button onClick={stopCamera} className="p-2">
                <X size={24} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest">Live Camera</h3>
              <div className="w-10" />
            </div>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="flex-1 w-full h-full object-cover scale-x-[-1]"
            />
            <div className="p-12 flex justify-center bg-black/40 backdrop-blur-md absolute bottom-0 w-full">
               <button 
                 onClick={capturePhoto}
                 className="w-20 h-20 bg-white rounded-full border-4 border-tac-blue p-1 flex items-center justify-center active:scale-90 transition-transform"
               >
                 <div className="w-full h-full bg-white rounded-full border-2 border-gray-100" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MessageBubble: React.FC<{ msg: ChatMessage; isMe: boolean; onReply: () => void }> = ({ msg, isMe, onReply }) => {
  const [showOptions, setShowOptions] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const handleDelete = async () => {
    if (!isAdmin && !isMe) return;
    if (confirm('Delete this message?')) {
      try {
        await deleteDoc(doc(db, 'chats', 'global', 'messages', msg.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `messages/${msg.id}`);
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
      <div className={`relative max-w-[85%] lg:max-w-2xl px-2.5 py-1.5 rounded-xl shadow-[0_1px_0.5px_rgba(0,0,0,0.1)] ${isMe ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none' : 'bg-white dark:bg-[#202c33] rounded-tl-none border border-black/5 dark:border-none'}`}>
        
      {/* Actions on Hover */}
      <div className={`absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isMe ? '-left-20' : '-right-20'}`}>
        <button 
          onClick={onReply}
          className="p-1.5 bg-white/90 dark:bg-slate-800 backdrop-blur rounded-full shadow-lg"
        >
          <Reply size={16} className="text-gray-500" />
        </button>
        {(isMe || isAdmin) && (
          <button 
            onClick={handleDelete}
            className="p-1.5 bg-white/90 dark:bg-slate-800 backdrop-blur rounded-full shadow-lg text-tac-red"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Mobile/Right-Click Options Overlay */}
      <AnimatePresence>
        {showOptions && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20"
            onClick={() => setShowOptions(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-2 shadow-2xl min-w-[160px] border border-gray-100 dark:border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => { onReply(); setShowOptions(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all"
              >
                <Reply size={18} className="text-tac-blue" />
                <span className="text-sm font-black text-tac-blue-dark dark:text-white">Reply Message</span>
              </button>
              {(isMe || isAdmin) && (
                <button 
                  onClick={() => { handleDelete(); setShowOptions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all text-tac-red"
                >
                  <Trash2 size={18} />
                  <span className="text-sm font-black">Delete Message</span>
                </button>
              )}
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

      {!isMe && (
        <p className={`text-[11px] font-black mb-0.5 opacity-90 ${msg.senderColor?.replace('bg-', 'text-') || 'text-tac-blue'}`}>{msg.senderName}</p>
      )}

      {msg.replyTo && (
        <div className={`mb-1.5 p-2 rounded-lg text-xs border-l-4 overflow-hidden ${isMe ? 'bg-[#cfe9cc] dark:bg-[#025144] border-tac-blue' : 'bg-gray-50 dark:bg-gray-800 border-tac-blue'}`}>
          <p className="font-bold text-tac-blue-dark dark:text-tac-blue opacity-70 mb-0.5 text-left">{msg.replyTo.sender}</p>
          <p className="opacity-60 truncate leading-tight text-left dark:text-white/60">{msg.replyTo.text}</p>
        </div>
      )}

      {msg.img && (
        <div className="mb-2 rounded-lg overflow-hidden border border-black/5 bg-white">
           <img src={msg.img} alt="Chat media" className="w-full max-h-80 object-cover" />
        </div>
      )}

      {msg.file && (
        <div className="mb-2">
           <a 
            href={msg.file} 
            download={msg.text?.split(':').pop()?.trim() || 'file'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur rounded-lg border border-black/5 hover:bg-white transition-all group/file"
          >
            <div className="w-10 h-10 bg-tac-blue-dark/5 text-tac-blue-dark rounded-full flex items-center justify-center shrink-0 group-hover/file:bg-tac-blue-dark group-hover/file:text-white transition-all">
              <File size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase text-tac-blue-dark tracking-widest truncate">Document Shared</p>
              <p className="text-[11px] text-gray-500 font-medium truncate italic">{msg.text?.split(':').pop()?.trim() || 'View File'}</p>
            </div>
          </a>
        </div>
      )}

      {msg.vid && (
        <div className="mb-2 rounded-lg overflow-hidden border border-black/5 bg-black">
          <video src={msg.vid} controls className="w-full max-h-80 object-contain" />
        </div>
      )}

      {msg.audio && (
        <div className="mb-2 p-3 bg-white/50 backdrop-blur rounded-lg border border-black/5">
           <div className="flex items-center gap-3">
              <button 
                onClick={(e) => {
                  const target = (e.currentTarget.nextElementSibling as HTMLAudioElement);
                  if (target.paused) target.play(); else target.pause();
                }}
                className="w-10 h-10 bg-tac-blue text-white rounded-full flex items-center justify-center shadow-md active:scale-90"
              >
                <Play size={20} />
              </button>
              <audio src={msg.audio} onPlay={(e) => e.currentTarget.parentElement?.querySelector('button')?.classList.add('bg-tac-red')} onPause={(e) => e.currentTarget.parentElement?.querySelector('button')?.classList.remove('bg-tac-red')} />
              <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                 <div className="h-full bg-tac-blue w-full opacity-30 animate-pulse" />
              </div>
           </div>
        </div>
      )}

      {msg.location && (
        <a 
          href={msg.location} 
          target="_blank" 
          rel="noreferrer"
          className="mb-2 block p-3 bg-white rounded-lg border border-black/5 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-tac-red/10 text-tac-red rounded-full flex items-center justify-center">
               <MapPin size={20} />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase text-tac-red tracking-widest">Shared Location</p>
               <p className="text-[11px] text-gray-500 font-medium">Click to view on Map</p>
             </div>
          </div>
        </a>
      )}

      <div className="text-[14px] text-[#111b21] dark:text-slate-200 leading-[19px] break-words pr-14 min-h-[1.25rem] text-left">
        {msg.text}
      </div>

      <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
        <span className="text-[10px] text-[#667781] leading-none mb-0.5">{msg.time}</span>
        {isMe && <CheckCheck size={13} className="text-[#53bdeb]" />}
      </div>
    </div>
  </motion.div>
  );
};

const AttachBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; color: string }> = ({ onClick, icon, label, color }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-3 group p-2 rounded-2xl transition-all hover:bg-gray-50"
  >
    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110 group-active:scale-90 ${color}`}>
      {icon}
    </div>
    <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider">{label}</span>
  </button>
);

export default ChatView;
