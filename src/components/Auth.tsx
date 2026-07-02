import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import {
  Eye, EyeOff, LogIn, Mail, Phone, User, UserPlus, Loader2, ArrowRight, KeyRound,
} from 'lucide-react';

// ── Validation Schemas ────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, { message: 'Name must be at least 2 characters' }).max(100),
  phone: z.string().trim().min(10, { message: 'Please enter a valid phone number' }).max(15).optional().or(z.literal('')),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

interface PendingUser { email: string; password: string; fullName: string; phone: string; }
interface Toast { id: number; title: string; description?: string; type?: 'error' | 'success' }

// ── Simple Toast Hook ─────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback(({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    const id = Date.now();
    setToasts(p => [...p, { id, title, description, type: variant === 'destructive' ? 'error' : 'success' }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toast, toasts };
}

// ── OTP Input Modal ───────────────────────────────────────────
function OtpModal({ open, onClose, title, description, value, onChange, onSubmit, onResend, timer, loading }: {
  open: boolean; onClose: () => void; title: string; description: string;
  value: string; onChange: (v: string) => void; onSubmit: () => void;
  onResend: () => void; timer: number; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="auth-modal-title">
          <LogIn size={18} style={{ color: 'var(--accent)' }} /> {title}
        </h2>
        <p className="auth-modal-desc">{description}</p>
        <input
          className="auth-input auth-otp-input"
          inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button className="auth-btn auth-btn-primary" onClick={onSubmit} disabled={loading || value.length !== 6}>
          {loading ? <Loader2 size={16} className="auth-spin" /> : null} Verify & Login
        </button>
        <button
          className="auth-text-btn"
          onClick={onResend}
          disabled={timer > 0 || loading}
        >
          {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
        </button>
        <button className="auth-text-btn auth-text-btn-muted" onClick={onClose}>← Back</button>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────
function ResetModal({ open, onClose, initialEmail }: { open: boolean; onClose: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (open) setEmail(initialEmail); }, [open, initialEmail]);

  const handleReset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="auth-modal-title">Reset Password</h2>
        {sent ? (
          <p className="auth-modal-desc" style={{ color: 'var(--accent)' }}>
            ✅ Reset link sent! Check your email inbox.
          </p>
        ) : (
          <>
            <p className="auth-modal-desc">Enter your email and we'll send a reset link.</p>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button className="auth-btn auth-btn-primary" onClick={handleReset} disabled={loading || !email.trim()}>
              {loading ? <Loader2 size={16} className="auth-spin" /> : null} Send Reset Link
            </button>
          </>
        )}
        <button className="auth-text-btn auth-text-btn-muted" onClick={onClose}>← Back</button>
      </div>
    </div>
  );
}

// ── Main Auth Page ────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const mounted = useRef(true);
  const authCompleted = useRef(false);
  const { toast, toasts } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // OTP states
  const [showSignupOtp, setShowSignupOtp] = useState(false);
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [signupOtpTimer, setSignupOtpTimer] = useState(0);

  const [resetOpen, setResetOpen] = useState(false);

  const [loginOtpOpen, setLoginOtpOpen] = useState(false);
  const [loginOtpEmail, setLoginOtpEmail] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpStep, setLoginOtpStep] = useState<'email' | 'verify'>('email');
  const [loginOtpTimer, setLoginOtpTimer] = useState(0);
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);

  // Effects
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

  useEffect(() => {
    if (signupOtpTimer <= 0) return;
    const t = setTimeout(() => setSignupOtpTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [signupOtpTimer]);

  useEffect(() => {
    if (loginOtpTimer <= 0) return;
    const t = setTimeout(() => setLoginOtpTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [loginOtpTimer]);

  // Validation
  const validate = useCallback(() => {
    setErrors({});
    try {
      isLogin ? loginSchema.parse({ email, password }) : registerSchema.parse({ fullName, phone, email, password });
      return true;
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        const errs: Record<string, string> = {};
        const flat = e.flatten();
        const fieldErrs = flat.fieldErrors as Record<string, string[] | undefined>;
        Object.entries(fieldErrs).forEach(([key, msgs]) => { if (msgs && msgs.length > 0) errs[key] = msgs[0]; });

        setErrors(errs);
      }
      return false;
    }

  }, [isLogin, email, password, fullName, phone]);

  // Sign In
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
      toast({ title: 'Sign In Failed', description: e?.message?.includes('Invalid login credentials') ? 'Invalid email or password.' : e?.message, variant: 'destructive' });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [email, password, navigate, toast, validate]);

  // Sign Up (OTP)
  const handleSignUp = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      setPendingUser({ email: email.trim(), password: password.trim(), fullName: fullName.trim(), phone: phone.trim() });
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, data: { full_name: fullName.trim(), phone: phone.trim() || null } },
      });
      if (error) throw error;
      setSignupOtpCode(''); setShowSignupOtp(true); setSignupOtpTimer(45);
      toast({ title: 'Verification Code Sent', description: `Enter the 6-digit code sent to ${email.trim()}` });
    } catch (e: any) {
      if (!mounted.current) return;
      toast({ title: 'Sign Up Failed', description: e?.message, variant: 'destructive' });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [email, fullName, password, phone, toast, validate]);

  // Verify Signup OTP
  const handleVerifySignupOtp = useCallback(async () => {
    if (!pendingUser || signupOtpCode.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: pendingUser.email, token: signupOtpCode, type: 'email' });
      if (error) throw error;
      if (pendingUser.password) {
        await supabase.auth.updateUser({ password: pendingUser.password });
      }
      authCompleted.current = true;
      toast({ title: 'Account Created', description: 'Your email is verified and account is ready.' });
      navigate('/');
    } catch (e: any) {
      if (!mounted.current) return;
      toast({ title: 'Verification Failed', description: e?.message || 'Invalid or expired code.', variant: 'destructive' });
      setSignupOtpCode('');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [navigate, pendingUser, signupOtpCode, toast]);

  const handleResendSignupOtp = useCallback(async () => {
    if (!pendingUser || signupOtpTimer > 0) return;
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({ email: pendingUser.email, options: { shouldCreateUser: true, data: { full_name: pendingUser.fullName } } });
      setSignupOtpTimer(45); setSignupOtpCode('');
      toast({ title: 'Code Resent' });
    } catch (e: any) {
      toast({ title: 'Resend Failed', description: e?.message, variant: 'destructive' });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [pendingUser, signupOtpTimer, toast]);

  // Google Login
  const handleGoogleLogin = async () => {
    authCompleted.current = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
    if (error) { authCompleted.current = false; toast({ title: 'Google Login Failed', description: error.message, variant: 'destructive' }); }
  };

  // Login OTP flow
  const sendLoginOtp = async () => {
    setLoginOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: loginOtpEmail.trim(), options: { shouldCreateUser: false } });
      if (error) throw error;
      setLoginOtpStep('verify'); setLoginOtpTimer(45); setLoginOtpCode('');
      toast({ title: 'OTP Sent' });
    } catch (e: any) {
      toast({ title: 'OTP Failed', description: e?.message, variant: 'destructive' });
    } finally {
      if (mounted.current) setLoginOtpLoading(false);
    }
  };

  const verifyLoginOtp = async () => {
    if (loginOtpCode.length !== 6) return;
    setLoginOtpLoading(true);
    authCompleted.current = true;
    try {
      const { error } = await supabase.auth.verifyOtp({ email: loginOtpEmail.trim(), token: loginOtpCode, type: 'email' });
      if (error) throw error;
      toast({ title: 'Signed In', description: 'OTP verification successful.' });
      setLoginOtpOpen(false); navigate('/');
    } catch (e: any) {
      authCompleted.current = false;
      toast({ title: 'Verification Failed', description: e?.message, variant: 'destructive' });
      setLoginOtpCode('');
    } finally {
      if (mounted.current) setLoginOtpLoading(false);
    }
  };

  const switchMode = useCallback(() => {
    setIsLogin(p => !p); setErrors({}); setShowSignupOtp(false); setSignupOtpCode(''); setPendingUser(null); setPassword('');
  }, []);

  // OTP verify screen for Sign Up
  if (showSignupOtp && pendingUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-badge"><Mail size={14} style={{ color: 'var(--accent)' }} /> Verify Email</div>
          <h1 className="auth-title">Enter <span className="auth-gradient">OTP</span></h1>
          <p className="auth-subtitle">We sent a 6-digit code to <strong>{pendingUser.email}</strong></p>
          <input
            className="auth-input auth-otp-input"
            inputMode="numeric" maxLength={6} placeholder="000000"
            value={signupOtpCode}
            onChange={e => setSignupOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <button className="auth-btn auth-btn-primary" onClick={handleVerifySignupOtp} disabled={loading || signupOtpCode.length !== 6}>
            {loading ? <Loader2 size={16} className="auth-spin" /> : null} Verify & Create Account
          </button>
          <button className="auth-text-btn" onClick={handleResendSignupOtp} disabled={signupOtpTimer > 0}>
            {signupOtpTimer > 0 ? `Resend in ${signupOtpTimer}s` : 'Resend Code'}
          </button>
          <button className="auth-text-btn auth-text-btn-muted" onClick={() => { setShowSignupOtp(false); setPendingUser(null); setSignupOtpCode(''); }}>
            ← Back to Sign Up
          </button>
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Badge */}
        <div className={`auth-badge ${isLogin ? '' : 'auth-badge-register'}`}>
          {isLogin ? <><LogIn size={14} /> Welcome Back</> : <><UserPlus size={14} /> Create Account</>}
        </div>

        {/* Title */}
        <h1 className="auth-title">
          {isLogin ? <>Sign <span className="auth-gradient">In</span></> : <>Create <span className="auth-gradient">Account</span></>}
        </h1>
        <p className="auth-subtitle">
          {isLogin ? 'Enter your credentials to access your account' : 'Create account with email OTP verification'}
        </p>

        {/* Form */}
        <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="auth-form">

          {!isLogin && (
            <>
              <div className="auth-field">
                <label className="auth-label"><User size={12} /> Full Name <span className="auth-required">*</span></label>
                <input id="fullName" className={`auth-input ${errors.fullName ? 'auth-input-error' : ''}`} type="text" placeholder="Your Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                {errors.fullName && <span className="auth-error">{errors.fullName}</span>}
              </div>
              <div className="auth-field">
                <label className="auth-label"><Phone size={12} /> Phone Number</label>
                <input id="phone" className={`auth-input ${errors.phone ? 'auth-input-error' : ''}`} type="tel" placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                {errors.phone && <span className="auth-error">{errors.phone}</span>}
              </div>
              <div className="auth-divider" />
            </>
          )}

          <div className="auth-field">
            <label className="auth-label"><Mail size={12} /> Email <span className="auth-required">*</span></label>
            <input id="email" className={`auth-input ${errors.email ? 'auth-input-error' : ''}`} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            {errors.email && <span className="auth-error">{errors.email}</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label"><KeyRound size={12} /> Password {isLogin && <span className="auth-required">*</span>}</label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                className={`auth-input auth-input-password ${errors.password ? 'auth-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={isLogin}
                minLength={isLogin ? 6 : undefined}
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(p => !p)} aria-label="Toggle password">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <span className="auth-error">{errors.password}</span>}
          </div>

          {isLogin && (
            <div className="auth-links-row">
              <button type="button" className="auth-text-link" onClick={() => setResetOpen(true)}>Forgot Password?</button>
              <button type="button" className="auth-text-link" onClick={() => { setLoginOtpOpen(true); setLoginOtpStep('email'); setLoginOtpEmail(email); setLoginOtpCode(''); }}>Login with OTP</button>
            </div>
          )}

          <button type="submit" className="auth-btn auth-btn-primary auth-btn-full" disabled={loading}>
            {loading
              ? <><Loader2 size={15} className="auth-spin" /> {isLogin ? 'Signing in...' : 'Sending OTP...'}</>
              : isLogin
                ? <>Sign In <ArrowRight size={15} /></>
                : <>Send Signup OTP <ArrowRight size={15} /></>
            }
          </button>
        </form>

        {/* Divider */}
        <div className="auth-or-divider"><span>Or continue with</span></div>

        {/* Google Login */}
        <button className="auth-btn auth-btn-google" onClick={handleGoogleLogin} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Switch Mode */}
        <div className="auth-switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button type="button" className="auth-switch-link" onClick={switchMode}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <p className="auth-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </div>

      {/* Modals */}
      <ResetModal open={resetOpen} onClose={() => setResetOpen(false)} initialEmail={email} />

      {/* Login OTP Modal */}
      {loginOtpOpen && (
        <div className="auth-modal-overlay" onClick={() => setLoginOtpOpen(false)}>
          <div className="auth-modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="auth-modal-title"><LogIn size={18} style={{ color: 'var(--accent)' }} /> Login with OTP</h2>
            {loginOtpStep === 'email' ? (
              <>
                <p className="auth-modal-desc">Enter your registered email to receive a one-time code.</p>
                <input className="auth-input" type="email" placeholder="you@example.com" value={loginOtpEmail} onChange={e => setLoginOtpEmail(e.target.value)} />
                <button className="auth-btn auth-btn-primary" onClick={sendLoginOtp} disabled={loginOtpLoading || !loginOtpEmail.trim()}>
                  {loginOtpLoading ? <Loader2 size={15} className="auth-spin" /> : null} Send OTP
                </button>
              </>
            ) : (
              <>
                <p className="auth-modal-desc">Enter the 6-digit code sent to <strong>{loginOtpEmail}</strong></p>
                <input className="auth-input auth-otp-input" inputMode="numeric" maxLength={6} placeholder="000000" value={loginOtpCode} onChange={e => setLoginOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                <button className="auth-text-btn" onClick={sendLoginOtp} disabled={loginOtpTimer > 0 || loginOtpLoading}>
                  {loginOtpTimer > 0 ? `Resend in ${loginOtpTimer}s` : 'Resend OTP'}
                </button>
                <button className="auth-btn auth-btn-primary" onClick={verifyLoginOtp} disabled={loginOtpLoading || loginOtpCode.length !== 6}>
                  {loginOtpLoading ? <Loader2 size={15} className="auth-spin" /> : null} Verify OTP & Login
                </button>
              </>
            )}
            <button className="auth-text-btn auth-text-btn-muted" onClick={() => setLoginOtpOpen(false)}>← Back</button>
          </div>
        </div>
      )}

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
