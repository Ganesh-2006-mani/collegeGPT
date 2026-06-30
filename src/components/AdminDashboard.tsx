import React, { useState, useEffect } from 'react';
import { 
  BarChart, HelpCircle, FileText, Activity, LogOut, Moon, Sun, Shield, 
  Trash, Edit, Plus, Upload, Loader, User, Search, X, Check, ArrowLeft, 
  Info, Sparkles, MessageSquare, AlertCircle
} from 'lucide-react';
import { FAQ, DocumentInfo, AdminLog, AnalyticsData } from '../types';

interface AdminDashboardProps {
  token: string;
  user: { id: string; name: string; email: string; role: 'student' | 'admin' };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onGoToStudentView: () => void;
}

type AdminTab = 'analytics' | 'faqs' | 'documents' | 'logs';

export default function AdminDashboard({
  token,
  user,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
  onGoToStudentView
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');

  // Main datasets
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  // Search/Filters
  const [faqSearch, setFaqSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');

  // General Loading state
  const [loading, setLoading] = useState(false);

  // FAQ Modal States
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('Academics');
  const [faqLoading, setFaqLoading] = useState(false);

  // Persistent PDF upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Regulations');

  // Load datasets on tab switch
  useEffect(() => {
    loadTabDataset();
  }, [activeTab]);

  const loadTabDataset = async () => {
    setLoading(true);
    try {
      if (activeTab === 'analytics') {
        const res = await fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setAnalytics(data);
      } else if (activeTab === 'faqs') {
        const res = await fetch('/api/faqs');
        const data = await res.json();
        if (res.ok) setFaqs(data);
      } else if (activeTab === 'documents') {
        const res = await fetch('/api/documents', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setDocuments(data);
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/logs', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FAQ OPERATION HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenFAQCreate = () => {
    setEditingFAQ(null);
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqCategory('Academics');
    setShowFAQModal(true);
  };

  const handleOpenFAQEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqCategory(faq.category);
    setShowFAQModal(true);
  };

  const handleSaveFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    setFaqLoading(true);
    try {
      const url = editingFAQ ? `/api/faqs/${editingFAQ.id}` : '/api/faqs';
      const method = editingFAQ ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: faqQuestion,
          answer: faqAnswer,
          category: faqCategory
        })
      });

      if (res.ok) {
        setShowFAQModal(false);
        loadTabDataset();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save FAQ');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to the FAQ API');
    } finally {
      setFaqLoading(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this FAQ from the chatbot database?')) return;

    try {
      const res = await fetch(`/api/faqs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadTabDataset();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------------------------
  // KNOWLEDGE BASE DOCUMENT UPLOAD HANDLERS
  // ---------------------------------------------------------------------------
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
      processPersistentPDF(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPersistentPDF(e.target.files[0]);
    }
  };

  const processPersistentPDF = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported.');
      return;
    }

    setUploadLoading(true);

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
            category: uploadCategory,
            fileBase64: base64
          })
        });

        const data = await res.json();
        if (res.ok) {
          loadTabDataset();
        } else {
          alert(data.error || 'Failed to process document');
        }
      } catch (err) {
        console.error(err);
        alert('Failed parsing the document. Make sure size is below 15MB.');
      } finally {
        setUploadLoading(false);
      }
    };
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('This will wipe out all parsed semantic chunks of this document, and the AI will lose access to its knowledge. Proceed?')) return;

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadTabDataset();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter lists
  const filteredFAQs = faqs.filter(f => 
    f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    f.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
    f.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.category.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-gray-900 dark:text-gray-50 overflow-hidden font-sans transition-colors duration-300">
      
      {/* 1. ADMIN SIDEBAR PANEL */}
      <div className="w-64 bento-sidebar flex-shrink-0 flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Logo Brand */}
          <div className="p-5 flex items-center gap-2.5 border-b border-white/10">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white text-blue-900 font-display font-bold shadow-sm">
              CG
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-base leading-none block text-white">CollegeGPT</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-white/70 block mt-0.5">Admin Desk</span>
            </div>
          </div>
 
          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
                activeTab === 'analytics'
                  ? 'bento-sidebar-btn-active'
                  : 'bento-sidebar-btn'
              }`}
            >
              <BarChart className="w-4 h-4" /> Analytics & Health
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
                activeTab === 'faqs'
                  ? 'bento-sidebar-btn-active'
                  : 'bento-sidebar-btn'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Manage FAQs
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
                activeTab === 'documents'
                  ? 'bento-sidebar-btn-active'
                  : 'bento-sidebar-btn'
              }`}
            >
              <FileText className="w-4 h-4" /> Knowledge Base PDFs
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
                activeTab === 'logs'
                  ? 'bento-sidebar-btn-active'
                  : 'bento-sidebar-btn'
              }`}
            >
              <Activity className="w-4 h-4" /> System Audit Logs
            </button>
          </div>
        </div>
 
        {/* Admin Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user.name.substring(0,2)}
            </div>
            <div className="text-left truncate">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[9px] text-white/65 truncate">Academic Administrator</div>
            </div>
          </div>
 
          <button
            onClick={onGoToStudentView}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-white/20 text-white hover:bg-white/10 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Test Chatbot View
          </button>
 
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleDarkMode}
              className="flex items-center justify-center gap-1.5 py-1 px-2 border border-white/15 hover:bg-white/10 rounded-lg text-xs text-white/80 hover:text-white cursor-pointer transition-all"
            >
              {isDarkMode ? <Sun className="w-3 h-3 text-amber-300" /> : <Moon className="w-3 h-3 text-white" />} Theme
            </button>
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 py-1 px-2 border border-white/15 hover:bg-white/10 rounded-lg text-xs text-red-200 hover:text-red-100 cursor-pointer transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* 2. ADMIN MAIN VIEWER CONTAINER */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        
        {/* Header banner */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="text-left">
            <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight text-gray-900 dark:text-white">
              {activeTab === 'analytics' && 'Analytics & Health'}
              {activeTab === 'faqs' && 'Chatbot FAQ Base'}
              {activeTab === 'documents' && 'Persistent Library Corpus'}
              {activeTab === 'logs' && 'System Audit Log'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'analytics' && 'General usage, user distributions, system health logs, and LLM response sentiments.'}
              {activeTab === 'faqs' && 'Manage static FAQs mapped into embeddings for responsive local answering.'}
              {activeTab === 'documents' && 'Upload and chunk persistent PDFs that feed into the AI Context grounding layer.'}
              {activeTab === 'logs' && 'Trace operational actions executed by the university administration desks.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded bg-green-50 dark:bg-green-950/20 text-green-600 text-xs font-mono font-bold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Authorized Desk
            </div>
          </div>
        </div>

        {/* Tab content renderer */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {loading && !analytics ? (
              <div className="py-20 text-center"><Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>
            ) : analytics ? (
              <>
                {/* Metric cards grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bento-card bento-card-interactive text-left">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500">Core Users</div>
                    <div className="font-display font-bold text-2xl text-gray-900 dark:text-white mt-1">{analytics.usersCount}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{analytics.studentsCount} Students / {analytics.adminsCount} Admins</div>
                  </div>
                  <div className="p-5 bento-card bento-card-interactive text-left">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500">Document Corpus</div>
                    <div className="font-display font-bold text-2xl text-gray-900 dark:text-white mt-1">{analytics.docsCount}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Processed Persistent PDFs</div>
                  </div>
                  <div className="p-5 bento-card bento-card-interactive text-left">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">FAQ Registries</div>
                    <div className="font-display font-bold text-2xl text-gray-900 dark:text-white mt-1">{analytics.faqsCount}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Embeddings-grounded FAQs</div>
                  </div>
                  <div className="p-5 bento-card bento-card-interactive text-left">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">Confidence Health</div>
                    <div className="font-display font-bold text-2xl text-gray-900 dark:text-white mt-1">{(analytics.avgConfidence * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-400 mt-1">Avg AI grounding confidence</div>
                  </div>
                </div>

                {/* Sentiment & General Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Sentiment Bar */}
                  <div className="p-6 bento-card text-left">
                    <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm md:text-base flex items-center gap-1.5 mb-4">
                      <Sparkles className="w-4 h-4 text-amber-500" /> User Interaction Sentiment
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                          <span>Positives</span>
                          <span className="font-mono text-green-500 font-bold">{analytics.sentiment.positive} chats</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: `${(analytics.sentiment.positive / Math.max(1, analytics.chatsCount)) * 100}%` }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                          <span>Neutrals</span>
                          <span className="font-mono text-gray-500 font-bold">{analytics.sentiment.neutral} chats</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gray-400 h-full rounded-full" style={{ width: `${(analytics.sentiment.neutral / Math.max(1, analytics.chatsCount)) * 100}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                          <span>Negatives</span>
                          <span className="font-mono text-red-500 font-bold">{analytics.sentiment.negative} chats</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: `${(analytics.sentiment.negative / Math.max(1, analytics.chatsCount)) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* General Status Info */}
                  <div className="p-6 bento-card text-left flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm md:text-base flex items-center gap-1.5 mb-2">
                        <MessageSquare className="w-4.5 h-4.5 text-blue-500" /> Active Conversations Summary
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Total of <span className="text-gray-950 dark:text-white font-bold">{analytics.chatsCount} active sessions</span> running in student and public terminals, executing over <span className="text-gray-950 dark:text-white font-bold">{analytics.messageCount} prompts</span>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex gap-3 text-xs text-blue-700 dark:text-blue-400 mt-4">
                      <Info className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">System Status: healthy</span>. 
                        PDF parsing engine is listening, and semantic search has fallback keyword indexing in case of API speed throttles.
                      </div>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div className="p-10 text-center text-xs text-gray-500 border border-dashed rounded-xl">No analytics available</div>
            )}
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Filter FAQs..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleOpenFAQCreate}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create FAQ Entry
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center"><Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>
            ) : filteredFAQs.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 border border-dashed rounded-xl font-mono">
                No FAQs matching search
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-850">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Question</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Answer Preview</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {filteredFAQs.map((faq) => (
                        <tr key={faq.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 text-left">
                          <td className="px-5 py-3 text-xs font-semibold text-gray-900 dark:text-white max-w-xs truncate">{faq.question}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 text-[10px] font-mono">{faq.category}</span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">{faq.answer}</td>
                          <td className="px-5 py-3 text-right text-xs space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenFAQEdit(faq)}
                              className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                              title="Edit FAQ"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFAQ(faq.id)}
                              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                              title="Delete FAQ"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Category Selector for upload */}
            <div className="p-6 bento-card text-left">
              <h3 className="font-display font-semibold text-gray-950 dark:text-white text-sm mb-2 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-500" /> Ground New Institutional Guidelines
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Upload university syllabus, grading guides, or safety procedures. The PDF is analyzed, parsed into logical overlapping chunks, embedded, and added to the college knowledge base permanently.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ground Category mapping</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    <option value="Regulations">Regulations & Conduct</option>
                    <option value="Admissions">Admissions & Registrar</option>
                    <option value="Hostel & Facilities">Hostel & Facilities</option>
                    <option value="Academics">Academic Syllabus</option>
                  </select>
                </div>

                <div className="flex-[2] flex flex-col justify-end">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`p-5 rounded-lg border-2 border-dashed text-center transition-all cursor-pointer ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
                    }`}
                  >
                    {uploadLoading ? (
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Loader className="w-4.5 h-4.5 animate-spin text-blue-500" />
                        Analyzing text, calculating semantic vector embeddings & seeding indices...
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold text-blue-500 hover:underline">
                          <label className="cursor-pointer">
                            Click to upload PDF guidelines
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                          </label>
                        </span>
                        {' '}or drag-and-drop. Size limit: 15MB.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* List Documents */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display font-semibold text-gray-950 dark:text-white text-sm md:text-base">Active Knowledge Base PDFs</h3>
                <input
                  type="text"
                  placeholder="Search PDFs..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="px-3 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {loading ? (
                <div className="py-12 text-center"><Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400 border border-dashed rounded-xl font-mono">No guideline documents found</div>
              ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-850">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">File Name</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Processed date</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Semantic Segments</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900 text-left">
                        {filteredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20">
                            <td className="px-5 py-3 text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 truncate max-w-xs">
                              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{doc.name}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 text-[10px] font-mono">{doc.category}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-400 font-mono">{new Date(doc.uploadDate).toLocaleDateString()}</td>
                            <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300 font-mono">{doc.chunkCount} chunks</td>
                            <td className="px-5 py-3 text-right text-xs">
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                title="Delete persistent context"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {loading ? (
              <div className="py-20 text-center"><Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 border border-dashed rounded-xl font-mono">No admin actions logged yet</div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
                    <thead className="bg-gray-50 dark:bg-gray-850">
                      <tr>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action Type</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Executor</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Audit Details</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20">
                          <td className="px-5 py-3 text-xs font-semibold text-blue-600 dark:text-blue-400">{log.action}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-gray-900 dark:text-white">{log.adminName}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-md truncate" title={log.details}>{log.details}</td>
                          <td className="px-5 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(log.timestamp).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. FAQ MODAL FOR CREATION/UPDATES */}
      {showFAQModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xl border border-gray-100 dark:border-gray-850 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 text-left">
              <h3 className="font-display font-semibold text-gray-950 dark:text-white text-sm md:text-base">
                {editingFAQ ? 'Update FAQ Record' : 'Register New FAQ'}
              </h3>
              <button 
                onClick={() => setShowFAQModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFAQ} className="p-6 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">FAQ Category</label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Academics">Academics</option>
                  <option value="Admissions">Admissions</option>
                  <option value="Campus Life">Campus Life</option>
                  <option value="Examinations">Examinations</option>
                  <option value="Placements">Placements</option>
                  <option value="Financial Aid">Financial Aid</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">FAQ Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is the passing criteria for semester final examinations?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">FAQ Answer</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide a detailed, accurate answer that the chatbot can cite..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFAQModal(false)}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={faqLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {faqLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Index FAQ Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
