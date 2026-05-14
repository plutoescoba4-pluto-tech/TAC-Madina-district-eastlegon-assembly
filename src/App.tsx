/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { HomeConfig } from './types';
import Landing from './components/Landing';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [config, setConfig] = useState<HomeConfig | null>(null);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    const unsub = onSnapshot(doc(db, 'settings', 'homeConfig'), (d) => {
      if (d.exists()) setConfig(d.data() as HomeConfig);
    });
    return unsub;
  }, []);

  const logo = config?.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/antigravity-9999.appspot.com/o/applet_assets%2Fchurch_logo.png?alt=media';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-tac-blue-dark">
        <div className="animate-pulse flex flex-col items-center gap-6">
           <img src={logo} alt="Church Logo" className="w-32 h-32 object-contain filter drop-shadow-2xl" />
           <div className="space-y-2 text-center">
             <h2 className="text-white font-black uppercase tracking-[0.3em] text-xs">The Apostolic Church Ghana</h2>
             <div className="h-1 w-24 bg-tac-red mx-auto rounded-full" />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Dynamic Watermark Logo */}
      <div className="watermark">
        <img src={logo} alt="Watermark" />
      </div>

      <Routes>
        <Route path="/" element={user && profile ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={user && profile ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/register" element={user && profile ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

