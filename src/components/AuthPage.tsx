import React, { useState } from 'react';
import { Network, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Sparkles, Database, Settings } from 'lucide-react';
import { AuthMode } from '../types/auth.ts';
import { signInWithEmail, signUpWithEmail, resetPasswordForEmail, isSupabaseReady } from '../lib/supabase.ts';

interface AuthPageProps {
  onAuthSuccess: () => void;
  onOpenConfig: () => void;
  supabaseConfigured: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  onOpenConfig,
  supabaseConfigured,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isSupabaseReady()) {
      setErrorMsg('Supabase connection credentials are required to authenticate. Click "Configure Supabase" below.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid academic or professional email address.');
      return;
    }

    if (mode === 'forgot_password') {
      try {
        setLoading(true);
        await resetPasswordForEmail(email.trim());
        setSuccessMsg(`A secure password recovery email has been dispatched to ${email}. Please check your inbox.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to dispatch password recovery email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Security policy requires passwords to be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Password and confirmation password do not match.');
        return;
      }

      try {
        setLoading(true);
        const res = await signUpWithEmail(fullName.trim(), email.trim(), password);
        if (res.session) {
          onAuthSuccess();
        } else if (res.user && !res.session) {
          setSuccessMsg('Registration submitted! Please verify your email or log in if email confirmation is disabled on your Supabase instance.');
          setMode('login');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Registration failed. Please review your credentials.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'login') {
      try {
        setLoading(true);
        await signInWithEmail(email.trim(), password);
        onAuthSuccess();
      } catch (err: any) {
        setErrorMsg(err.message || 'Invalid email or password. Please verify your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#252D2B] flex flex-col justify-between selection:bg-[#E88968]/30 selection:text-[#174A45]">
      {/* Top Academic Ribbon */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D8C8A8] bg-[#FAF7F2]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#174A45] flex items-center justify-center text-[#F5F1E8] shadow-xs">
            <Network className="w-4 h-4 text-[#FAF7F2]" />
          </div>
          <div>
            <span className="font-editorial text-xl font-bold tracking-tight text-[#174A45]">
              ModelMind
            </span>
            <span className="ml-2 text-xs text-[#636E6B] font-mono hidden sm:inline">
              DSA Knowledge Graph &amp; Mind Map Engine
            </span>
          </div>
        </div>

        <button
          onClick={onOpenConfig}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D8C8A8] bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#174A45] transition cursor-pointer"
          title="Supabase Database Settings"
        >
          <Settings className="w-3.5 h-3.5 text-[#E88968]" />
          <span>{supabaseConfigured ? 'Supabase Connected' : 'Configure Supabase'}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              supabaseConfigured ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
            }`}
          />
        </button>
      </header>

      {/* Main Auth Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Header Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE8DC] border border-[#D8C8A8] text-[#174A45] text-xs font-mono font-medium mb-3">
              <Sparkles className="w-3 h-3 text-[#E88968]" />
              <span>Scholar Workspace Authentication</span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#174A45]">
              {mode === 'login' && 'Sign In to Your Workspace'}
              {mode === 'signup' && 'Create Scholar Account'}
              {mode === 'forgot_password' && 'Reset Scholar Password'}
            </h1>
            <p className="text-xs sm:text-sm text-[#636E6B] mt-1.5 font-sans">
              {mode === 'login' && 'Access persistent knowledge graphs, custom mind maps, and algorithmic learning paths.'}
              {mode === 'signup' && 'Register your academic profile to automatically persist and bookmark your DSA analyses.'}
              {mode === 'forgot_password' && 'Enter your verified email to receive a recovery token.'}
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FFF8EB] border border-[#D8C8A8] text-xs text-[#8C6D3B]">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-[#8C6D3B] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#174A45]">Supabase Connection Required</p>
                  <p className="mt-0.5 text-[#636E6B]">
                    Please configure your Supabase Project URL and Public Anon Key to enable real PostgreSQL authentication &amp; Row Level Security.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenConfig}
                    className="mt-2 text-xs font-semibold text-[#174A45] underline underline-offset-2 hover:text-[#E88968] cursor-pointer"
                  >
                    Open Supabase Setup Drawer &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#FBEBE7] border border-[#E88968]/60 text-[#8C2A14] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#E88968] shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#EAF3EA] border border-[#A9BCA8] text-[#174A45] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A7059] shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#174A45] mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C9895] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Prof. Ada Lovelace"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8C8A8] rounded-xl text-xs sm:text-sm text-[#252D2B] placeholder:text-[#8C9895] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#174A45] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C9895] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8C8A8] rounded-xl text-xs sm:text-sm text-[#252D2B] placeholder:text-[#8C9895] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] transition"
                />
              </div>
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#174A45] uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-[#E88968] hover:text-[#174A45] font-medium transition cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C9895] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8C8A8] rounded-xl text-xs sm:text-sm text-[#252D2B] placeholder:text-[#8C9895] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] transition"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#174A45] mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#8C9895] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8C8A8] rounded-xl text-xs sm:text-sm text-[#252D2B] placeholder:text-[#8C9895] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] transition"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#D8C8A8] text-[#174A45] focus:ring-[#174A45] cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-[#636E6B] cursor-pointer select-none">
                  Remember me on this academic workstation
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In to Workspace'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot_password' && 'Send Password Recovery Email'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#E88968]" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 pt-5 border-t border-[#D8C8A8] text-center text-xs text-[#636E6B]">
            {mode === 'login' && (
              <p>
                New researcher or scholar?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-[#174A45] hover:text-[#E88968] transition cursor-pointer underline underline-offset-2"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have a scholar account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-[#174A45] hover:text-[#E88968] transition cursor-pointer underline underline-offset-2"
                >
                  Sign in here
                </button>
              </p>
            )}

            {mode === 'forgot_password' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-[#174A45] hover:text-[#E88968] transition cursor-pointer underline underline-offset-2"
                >
                  Return to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="px-6 py-4 text-center border-t border-[#D8C8A8] text-xs text-[#8C9895] bg-[#FAF7F2]/50">
        <p>
          ModelMind Editorial Academic Platform &bull; Powered by C++14 Graph Algorithms &bull; Supabase PostgreSQL
        </p>
      </footer>
    </div>
  );
};
