import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Search, Trash, ThumbsUp, ThumbsDown, RefreshCw, 
  Copy, Moon, Sun, FileText, Upload, LogOut, Volume2, Mic, MicOff, Send, 
  HelpCircle, Check, Loader, User, Key, X, Sparkles, HelpCircle as HelpIcon 
} from 'lucide-react';
import { ChatSession, ChatMessage } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface StudentDashboardProps {
  token: string;
  user: { id: string; name: string; email: string; role: 'student' | 'admin' };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What scholarships are available for high performers?",
  "Tell me about the campus placement package and average package.",
  "What is the attendance code of conduct and policy?",
  "What are the hostel and mess facilities?",
  "How do I apply for undergraduate admission?"
];

export default function StudentDashboard({ 
  token, 
  user, 
  isDarkMode, 
  onToggleDarkMode, 
  onLogout 
}: StudentDashboardProps) {
  // Chat States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(false);

  // Suggested questions popular list
  const [popularFAQs, setPopularFAQs] = useState<any[]>([]);

  // Temporary Document analysis
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [tempContext, setTempContext] = useState<string>('');
  const [tempStats, setTempStats] = useState<{ charCount: number; chunkCount: number } | null>(null);
  const [tempLoading, setTempLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Audio / Speech States
  const [isListening, setIsListening] = useState(false);
  const [currentlyReadingIdx, setCurrentlyReadingIdx] = useState<number | null>(null);

  // Feedback states
  const [likedMessages, setLikedMessages] = useState<Record<string, 'like' | 'dislike'>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat histories and popular FAQs
  useEffect(() => {
    fetchSessions();
    fetchFAQs();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, loadingMsg]);

  // Fetch session histories
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          loadActiveSession(data[0].id);
        } else if (data.length === 0) {
          handleNewChat('Welcome Session');
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };

  // Fetch FAQs to populate popular list
  const fetchFAQs = async () => {
    try {
      const res = await fetch('/api/faqs');
      const data = await res.json();
      if (res.ok) {
        setPopularFAQs(data.slice(0, 4)); // Show top 4
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Switch chat
  const loadActiveSession = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create new session
  const handleNewChat = async (customTitle?: string) => {
    try {
      const res = await fetch('/api/chats/new', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: customTitle || `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` })
      });
      const data = await res.json();
      if (res.ok) {
        setSessions(prev => [data, ...prev]);
        setActiveSession(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent, presetMsg?: string) => {
    if (e) e.preventDefault();
    const query = presetMsg || inputMessage;
    if (!query.trim() || !activeSession || loadingMsg) return;

    setInputMessage('');
    setLoadingMsg(true);

    try {
      const res = await fetch(`/api/chats/${activeSession.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: query,
          temporaryDocContext: tempContext || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data.chat);
        // Update session title in list if first message is sent
        setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, timestamp: new Date().toISOString() } : s));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsg(false);
    }
  };

  // Regenerate response
  const handleRegenerate = async () => {
    if (!activeSession || loadingMsg) return;
    setLoadingMsg(true);

    try {
      const res = await fetch(`/api/chats/${activeSession.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          temporaryDocContext: tempContext || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data.chat);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsg(false);
    }
  };

  // Delete chat session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const remaining = sessions.filter(s => s.id !== id);
        setSessions(remaining);
        if (activeSession?.id === id) {
          setActiveSession(remaining.length > 0 ? remaining[0] : null);
          if (remaining.length === 0) {
            handleNewChat();
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear all chats
  const handleClearAllChats = async () => {
    if (!confirm('This will wipe out all your saved chat conversations. Proceed?')) return;

    try {
      const res = await fetch('/api/chats', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions([]);
        setActiveSession(null);
        handleNewChat('New Clean Workspace');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle PDF Upload for student temporary analysis
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processTempPDF(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processTempPDF(e.target.files[0]);
    }
  };

  const processTempPDF = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported.');
      return;
    }

    setTempFile(file);
    setTempLoading(true);
    setTempContext('');
    setTempStats(null);

    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: file.name,
            category: 'Temporary Study',
            fileBase64: base64,
            isTemporary: true
          })
        });
        const data = await res.json();
        if (res.ok) {
          setTempContext(data.textContext);
          setTempStats({
            charCount: data.characterCount,
            chunkCount: data.chunkCount
          });
        } else {
          alert(data.error || 'Failed to parse PDF file');
          setTempFile(null);
        }
      } catch (e) {
        console.error(e);
        alert('Failed parsing the document. Check if the backend is running.');
        setTempFile(null);
      } finally {
        setTempLoading(false);
      }
    };
  };

  const removeTempFile = () => {
    setTempFile(null);
    setTempContext('');
    setTempStats(null);
  };

  // Browser Text-To-Speech (audio)
  const handleReadAloud = (text: string, index: number) => {
    if (currentlyReadingIdx === index) {
      window.speechSynthesis.cancel();
      setCurrentlyReadingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown before speaking
    const cleanText = text.replace(/[*#`_|\-\[\]()]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      setCurrentlyReadingIdx(null);
    };

    window.speechSynthesis.speak(utterance);
    setCurrentlyReadingIdx(index);
  };

  // Browser Voice Input (Speech recognition)
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Web Speech Recognition. Please try Google Chrome or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(prev => prev + ' ' + transcript);
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Change Password API
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    setPwdLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPwdSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(chatSearch.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(chatSearch.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-gray-900 dark:text-gray-50 overflow-hidden font-sans transition-colors duration-300">
      
      {/* 1. SIDEBAR HISTORY */}
      <div className="hidden md:flex flex-col w-64 bento-sidebar flex-shrink-0 relative overflow-hidden">
        
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white text-blue-900 flex items-center justify-center font-display font-bold text-base shadow-sm">
              C
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">CollegeGPT</span>
          </div>
          <button 
            onClick={() => handleNewChat()}
            className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
            title="Start New Chat"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* History Search */}
        <div className="p-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/50">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search chat history..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10"
            />
          </div>
        </div>

        {/* Previous Chat Lists */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
          <div className="text-[10px] font-semibold text-white/50 px-3 uppercase tracking-wider mb-2">
            Conversations
          </div>
          {filteredSessions.length === 0 ? (
            <div className="text-center text-xs text-white/40 py-6 font-mono">
              No matching chats
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadActiveSession(session.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-all group ${
                  activeSession?.id === session.id
                    ? 'bento-sidebar-btn-active'
                    : 'bento-sidebar-btn'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{session.title}</span>
                </div>
                <div className="flex items-center">
                  <Trash 
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-200 transition-all ml-1 cursor-pointer" 
                    title="Delete Chat"
                  />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          
          {/* User Widget */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {user.name.substring(0,2)}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-white/60 truncate capitalize">{user.role} Portal</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center justify-center gap-1.5 py-1 px-2 border border-white/15 hover:bg-white/10 rounded-lg text-xs text-white/80 hover:text-white cursor-pointer transition-all"
            >
              <Key className="w-3 h-3" /> Security
            </button>
            <button
              onClick={onToggleDarkMode}
              className="flex items-center justify-center gap-1.5 py-1 px-2 border border-white/15 hover:bg-white/10 rounded-lg text-xs text-white/80 hover:text-white cursor-pointer transition-all"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-white" />} Mode
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClearAllChats}
              className="flex-1 py-1 text-center border border-transparent text-[11px] font-semibold text-red-200 hover:text-red-100 hover:bg-white/5 rounded-md cursor-pointer transition-all"
            >
              Clear Chats
            </button>
            <button
              onClick={onLogout}
              className="p-1 border border-white/15 hover:bg-white/10 rounded-lg text-white/80 hover:text-red-200 cursor-pointer transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CHAT FEED & UTILITIES CONTAINER */}
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        
        {/* Mobile Navbar Header */}
        <div className="flex md:hidden items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-display font-bold text-sm">
              C
            </div>
            <span className="font-display font-bold text-base tracking-tight">CollegeGPT</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNewChat()}
              className="p-1 rounded text-gray-500 dark:text-gray-400"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleDarkMode}
              className="p-1 rounded text-gray-500 dark:text-gray-400"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onLogout}
              className="p-1 rounded text-gray-500 dark:text-gray-400"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop Active Chat Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="text-left">
            <h2 className="font-display font-semibold text-sm md:text-base text-gray-900 dark:text-white">
              {activeSession ? activeSession.title : 'No Session Selected'}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Core: gemini-3.5-flash (Online)
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeSession && activeSession.confidenceScore && (
              <div className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-mono font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Confidence: {(activeSession.confidenceScore * 100).toFixed(0)}%
              </div>
            )}
            {activeSession && activeSession.sentiment && (
              <div className="px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-mono capitalize">
                Sentiment: {activeSession.sentiment}
              </div>
            )}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
          {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
            activeSession.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase shadow-sm border ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white dark:bg-gray-850 text-blue-600 border-gray-200 dark:border-gray-800'
                }`}>
                  {msg.role === 'user' ? user.name.substring(0,2) : 'AI'}
                </div>

                {/* Bubble */}
                <div className="space-y-1">
                  <div className={`p-4 shadow-sm text-left relative group ${
                    msg.role === 'user' ? 'bento-chat-user' : 'bento-chat-ai'
                  }`}>
                    {/* Message Body */}
                    {msg.role === 'user' ? (
                      <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {/* AI Message Action Bar */}
                    {msg.role === 'model' && (
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleCopyToClipboard(msg.content, index)}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer"
                          title="Copy response"
                        >
                          {copiedIdx === index ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleReadAloud(msg.content, index)}
                          className={`p-1 rounded transition-all cursor-pointer ${
                            currentlyReadingIdx === index ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                          }`}
                          title={currentlyReadingIdx === index ? "Stop voice narration" : "Narration (Read Aloud)"}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        {index === activeSession.messages.length - 1 && (
                          <button
                            onClick={handleRegenerate}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer"
                            title="Regenerate response"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => {
                              const key = `${activeSession.id}-${index}`;
                              setLikedMessages(prev => ({ ...prev, [key]: 'like' }));
                            }}
                            className={`p-1 rounded cursor-pointer transition-all ${
                              likedMessages[`${activeSession.id}-${index}`] === 'like'
                                ? 'text-green-500 bg-green-50 dark:bg-green-950/20'
                                : 'text-gray-400 hover:text-green-500'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              const key = `${activeSession.id}-${index}`;
                              setLikedMessages(prev => ({ ...prev, [key]: 'dislike' }));
                            }}
                            className={`p-1 rounded cursor-pointer transition-all ${
                              likedMessages[`${activeSession.id}-${index}`] === 'dislike'
                                ? 'text-red-500 bg-red-50 dark:bg-red-950/20'
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-[9px] font-mono text-gray-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 max-w-lg mx-auto">
              <HelpCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-display font-semibold text-gray-900 dark:text-white">
                How can I assist you today?
              </h3>
              <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1 mb-6">
                I am trained on the college code of conduct, library hours, hostel regulations, and can run analyses on any PDF you drag into the analyzer drawer.
              </p>
            </div>
          )}

          {/* Thinking loading indicator */}
          {loadingMsg && (
            <div className="flex gap-3 max-w-md mr-auto">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-850 text-blue-600 border border-gray-200 dark:border-gray-850 flex items-center justify-center text-xs font-bold font-mono">
                AI
              </div>
              <div className="p-4 shadow-sm text-left bento-chat-ai">
                <div className="flex items-center gap-1.5 pulse-dots">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. STUDENT PDF TEMPORARY ANALYZER PANEL */}
        <div className="px-4 md:px-6 mb-2">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`p-4 transition-all bento-card ${
              tempFile 
                ? 'bg-blue-50/20 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/40'
                : dragActive 
                  ? 'border-dashed border-blue-500 bg-blue-50/55 dark:bg-blue-950/20'
                  : 'border-dashed'
            }`}
          >
            {tempLoading ? (
              <div className="flex items-center justify-center gap-2 py-1 text-xs text-gray-500">
                <Loader className="w-4 h-4 animate-spin text-blue-500" />
                Parsing document text chunks and caching temporary context...
              </div>
            ) : tempFile ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 truncate text-left">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{tempFile.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Cached Context: {tempStats?.charCount || 0} characters across {tempStats?.chunkCount || 0} semantic segments.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 text-[9px] font-mono">Grounded</span>
                  <button 
                    onClick={removeTempFile}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    title="Remove context"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-blue-500 hover:underline cursor-pointer">
                  <label className="cursor-pointer">
                    Upload PDF for temporary study ground
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      onChange={handleFileSelect} 
                    />
                  </label>
                </span>
                {' '}or drag it here. CollegeGPT will temporarily prioritize this context.
              </div>
            )}
          </div>
        </div>

        {/* Shortcuts / Suggested Questions */}
        {activeSession && activeSession.messages && activeSession.messages.length <= 1 && (
          <div className="px-4 md:px-6 mb-2">
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {SUGGESTED_QUESTIONS.map((q, qIdx) => (
                <button
                  key={qIdx}
                  onClick={() => handleSendMessage(undefined, q)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-[10px] md:text-xs text-gray-600 dark:text-gray-400 transition-all font-medium text-left cursor-pointer shadow-xs hover:shadow-sm bento-card-interactive"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Inputs */}
        <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={tempFile ? "Ask about your PDF document..." : "Type your query about admissions, hostel, scholarships..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loadingMsg}
                className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-850 text-xs md:text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
              />
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                  isListening 
                    ? 'text-red-500 bg-red-50 dark:bg-red-950/20 animate-pulse' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                }`}
                title={isListening ? "Stop Voice Input" : "Dictation (Voice-to-Text)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loadingMsg || !inputMessage.trim()}
              className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold transition-all shadow-sm hover:shadow flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 4. SECURITY / PASSWORD CHANGE MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md border border-gray-100 dark:border-gray-850 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-display font-semibold text-gray-950 dark:text-white text-sm md:text-base flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-500" /> Security Settings
              </h3>
              <button 
                onClick={() => { setShowPasswordModal(false); setPwdError(''); setPwdSuccess(''); }}
                className="p-1 rounded-full hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {pwdError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">{pwdError}</div>}
              {pwdSuccess && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-xs text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30">{pwdSuccess}</div>}

              <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-lg shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {pwdLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Update Access Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
