import React, { useState, useEffect } from 'react';
import AuthScreens from './components/AuthScreens';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import { User } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Dashboard routing helper for admins who can switch between the chatbot view and the desk
  const [adminViewingStudentTab, setAdminViewingStudentTab] = useState(false);

  // Dark/Light Mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('collegegpt_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Hydrate session on launch
  useEffect(() => {
    const savedToken = localStorage.getItem('collegegpt_token');
    const savedUser = localStorage.getItem('collegegpt_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse hydrated session', e);
        handleLogout();
      }
    }
  }, []);

  // Update HTML class for dark theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('collegegpt_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('collegegpt_theme', 'light');
    }
  }, [isDarkMode]);

  const handleLoginSuccess = (newToken: string, loggedUser: User) => {
    setToken(newToken);
    setUser(loggedUser);
    setAdminViewingStudentTab(false);
    localStorage.setItem('collegegpt_token', newToken);
    localStorage.setItem('collegegpt_user', JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(e => console.error(e));
    }

    setToken(null);
    setUser(null);
    setAdminViewingStudentTab(false);
    localStorage.removeItem('collegegpt_token');
    localStorage.removeItem('collegegpt_user');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Route Views
  if (!token || !user) {
    return <AuthScreens onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Admin Desk for administrators
  if (user.role === 'admin' && !adminViewingStudentTab) {
    return (
      <AdminDashboard
        token={token}
        user={user}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        onGoToStudentView={() => setAdminViewingStudentTab(true)}
      />
    );
  }

  // Render Student Chat Interface
  return (
    <div className="relative">
      {/* Back to Admin Desk Floating Banner for logged-in administrators testing the chatbot view */}
      {user.role === 'admin' && adminViewingStudentTab && (
        <div className="bg-blue-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow z-30 font-semibold sticky top-0">
          <span>Viewing Chatbot in testing/simulation sandbox.</span>
          <button
            onClick={() => setAdminViewingStudentTab(false)}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded font-bold transition-all cursor-pointer"
          >
            Return to Administrator desk
          </button>
        </div>
      )}
      
      <StudentDashboard
        token={token}
        user={user}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
    </div>
  );
}
