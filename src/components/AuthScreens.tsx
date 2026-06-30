import React, { useState } from 'react';
import { Shield, Mail, Lock, User, Key, ArrowRight, Loader } from 'lucide-react';

interface AuthScreensProps {
  onLoginSuccess: (token: string, user: { id: string; name: string; email: string; role: 'student' | 'admin' }) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthScreens({ onLoginSuccess }: AuthScreensProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setError('');
    setInfo('');
  };

  const handleToggleMode = (newMode: AuthMode) => {
    resetState();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        
        onLoginSuccess(data.token, data.user);
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        setInfo('Registration successful! Please login with your credentials.');
        setMode('login');
        setPassword('');
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password reset request failed');

        setInfo(data.message || 'If registered, a code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-md bento-card p-8 transition-colors duration-300">
        
        {/* College GPT Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-3 border border-blue-100 dark:border-blue-900/30">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            CollegeGPT
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Official University AI Portal & Knowledge Base
          </p>
        </div>

        {/* Info or Error Notification */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-xs text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30">
            {info}
          </div>
        )}

        {/* Auth Mode Tabs */}
        {mode !== 'forgot' && (
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 border border-gray-200/20">
            <button
              onClick={() => { handleToggleMode('login'); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { handleToggleMode('register'); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Admin vs Student selector on Register */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'student'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'admin'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Administrator
                </button>
              </div>
            </div>
          )}

          {/* Full Name Input on Register */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">University Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="e.g. student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            {mode === 'login' && (
              <p className="text-[10px] text-gray-400">
                Tip: Enter <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.2 rounded font-mono text-xs text-gray-500 select-all">student@college.edu</code> or <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.2 rounded font-mono text-xs text-gray-500 select-all">admin@college.edu</code> to test.
              </p>
            )}
          </div>

          {/* Password Input (only if login/register) */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleToggleMode('forgot')}
                    className="text-[10px] font-semibold text-blue-500 hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Password (e.g. student123 or admin123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold text-xs md:text-sm rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <>
                Access Campus Core <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'register' ? (
              'Create My Credentials'
            ) : (
              'Request Verification Code'
            )}
          </button>
        </form>

        {/* Back to Login selector */}
        {mode === 'forgot' && (
          <div className="text-center mt-6">
            <button
              onClick={() => handleToggleMode('login')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white underline"
            >
              Back to Campus Gate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
