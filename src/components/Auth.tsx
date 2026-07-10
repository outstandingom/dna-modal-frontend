import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Eye, EyeOff, LogIn, Mail, Loader2, ArrowRight, KeyRound, ExternalLink,
} from 'lucide-react';

// ── Toast Hook ────────────────────────────────────────────────
interface Toast { id: number; title: string; description?: string; type?: 'error' | 'success' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback(({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    const id = Date.now();
    setToasts(p => [...p, { id, title, description, type: variant === 'destructive' ? 'error' : 'success' }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toast, toasts };
}

// ── Main Auth Page ────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const mounted = useRef(true);
  const authCompleted = useRef(false);
  const { toast, toasts } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate('/');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (authCompleted.current && session?.user && mounted.current) navigate('/');
    });
    return () => { mounted.current = false; subscription.unsubscribe(); };
  }, [navigate]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email address';
    if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password]);

  const handleSignIn = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    authCompleted.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
      navigate('/');
    } catch (e: any) {
      authCompleted.current = false;
      if (!mounted.current) return;
      toast({
        title: 'Sign In Failed',
        description: e?.message?.includes('Invalid login credentials') ? 'Invalid email or password.' : e?.message,
        variant: 'destructive',
      });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [email, password, navigate, toast, validate]);

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Badge */}
        <div className="auth-badge">
          <LogIn size={14} /> Welcome Back
        </div>

        {/* Title */}
        <h1 className="auth-title">
          Sign <span className="auth-gradient">In</span>
        </h1>
        <p className="auth-subtitle">
          Enter your credentials to access the DNA Knowledge Graph
        </p>

        {/* Form */}
        <form onSubmit={handleSignIn} className="auth-form">
          <div className="auth-field">
            <label className="auth-label"><Mail size={12} /> Email <span className="auth-required">*</span></label>
            <input
              id="email"
              className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {errors.email && <span className="auth-error">{errors.email}</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label"><KeyRound size={12} /> Password <span className="auth-required">*</span></label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                className={`auth-input auth-input-password ${errors.password ? 'auth-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(p => !p)} aria-label="Toggle password">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <span className="auth-error">{errors.password}</span>}
          </div>

          <button type="submit" className="auth-btn auth-btn-primary auth-btn-full" disabled={loading}>
            {loading
              ? <><Loader2 size={15} className="auth-spin" /> Signing in...</>
              : <>Sign In <ArrowRight size={15} /></>
            }
          </button>
        </form>

        {/* Divider */}
        <div className="auth-or-divider"><span>Don't have an account?</span></div>

        {/* Sign Up — redirect to growhaz.com */}
        <a
          href="https://www.growhaz.com/auth"
          target="_blank"
          rel="noopener noreferrer"
          className="auth-btn auth-btn-google"
          style={{ textDecoration: 'none', textAlign: 'center' }}
        >
          <ExternalLink size={16} />
          Create Account on GrowHaz
        </a>

        <p className="auth-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ── Toast Container Component ─────────────────────────────────
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="auth-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`auth-toast ${t.type === 'error' ? 'auth-toast-error' : 'auth-toast-success'}`}>
          <strong>{t.title}</strong>
          {t.description && <p>{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
