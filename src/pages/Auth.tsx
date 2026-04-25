import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountrySelect } from '@/components/CountrySelect';
import { Mail, Lock, User, ArrowRight, Building2, Phone, Globe, Zap, CreditCard, ShieldCheck, CheckCircle2, Clock, RotateCcw, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { BrandLogo } from '@/components/BrandLogo';
import { notifyError, notifySuccess } from '@/lib/error-toast';

interface AuthProps {
  defaultMode?: 'login' | 'signup';
}

export default function Auth({ defaultMode = 'login' }: AuthProps) {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup multi-step
  const [signupStep, setSignupStep] = useState(1);
  const [signupComplete, setSignupComplete] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCurrency, setBusinessCurrency] = useState('USD');
  const [country, setCountry] = useState('US');

  // Repeat-attempt tracking — counts how many times the same email has been
  // submitted in this session. Drives the "we already sent it" guidance UI.
  const [signupAttempts, setSignupAttempts] = useState(0);
  const [lastAttemptAt, setLastAttemptAt] = useState<number | null>(null);
  const [lastAttemptEmail, setLastAttemptEmail] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  // Cooldown timer between resend attempts (60s, matches Supabase rate limit).
  useEffect(() => {
    if (!lastAttemptAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastAttemptAt) / 1000);
      setSecondsUntilResend(Math.max(0, 60 - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastAttemptAt]);

  useEffect(() => {
    setIsLogin(defaultMode === 'login');
    setSignupStep(1);
    setSignupComplete(false);
  }, [defaultMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      notifySuccess('Signed in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notifyError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      notifyError('Password must be at least 6 characters');
      return;
    }
    setSignupStep(2);
  };

  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) {
      notifyError('Your name is required');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            phone_number: phoneNumber,
            business_name: businessName || `${displayName}'s Business`,
            business_currency: businessCurrency,
            country,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Track this attempt so the success screen can adapt for repeat users.
      const isSameEmail = lastAttemptEmail === email;
      setSignupAttempts(isSameEmail ? signupAttempts + 1 : 1);
      setLastAttemptEmail(email);
      setLastAttemptAt(Date.now());
      setSignupComplete(true);
      notifySuccess('Account created! Check your email to confirm.');
    } catch (error: any) {
      // Pass the full error object so notifyError can read .code / .error_code
      // (e.g. weak_password, user_already_exists, email_address_invalid).
      notifyError(error);
    } finally {
      setLoading(false);
    }
  };

  // Resend the signup confirmation email. Used when the user clicks
  // "Resend confirmation email" on the post-signup screen. Respects the
  // 60s cooldown enforced by Supabase to prevent spam.
  const handleResendConfirmation = async () => {
    if (secondsUntilResend > 0) {
      notifyError(`Please wait ${secondsUntilResend}s before requesting another email.`);
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setSignupAttempts(signupAttempts + 1);
      setLastAttemptAt(Date.now());
      notifySuccess('Confirmation email re-sent. Check your inbox.');
    } catch (error: any) {
      notifyError(error?.message || 'Could not resend email');
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      notifyError('Enter your email address first');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      notifySuccess('Password reset link sent to your email');
    } catch (error: any) {
      notifyError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="gradient-glow pointer-events-none fixed inset-0" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <BrandLogo
            iconOnly
            iconSizeClassName="h-44 md:h-52"
            textClassName="text-foreground"
          />
        </Link>

        {isLogin ? (
          /* ── LOGIN ── */
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2 text-center tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">Sign in to your merchant dashboard</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="merchant@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 bg-background border-border" required />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 bg-background border-border" required minLength={6} />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Don't have an account? <span className="text-primary font-medium">Sign up</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ── SIGNUP ── */
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            {signupComplete ? (
              <div className="text-center py-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-9 w-9 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2 tracking-tight">Check your email</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
                  Click it to activate your account, then sign in.
                </p>
                <Button onClick={() => navigate('/login')} className="w-full gap-2" size="lg">
                  Go to Sign In <ArrowRight className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => { setSignupComplete(false); setSignupStep(1); }}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground"
                >
                  Used the wrong email? Start over
                </button>
              </div>
            ) : (
              <>
            <h2 className="font-display text-3xl font-bold text-foreground mb-2 tracking-tight">Let's create your account.</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Signing up is fast and free — no commitments or long-term contracts required.
            </p>

            {/* Value Props */}
            {signupStep === 1 && (
              <div className="grid grid-cols-3 gap-3 mb-6 pb-6 border-b border-border">
                <div className="text-center">
                  <Zap className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                  <p className="text-xs font-medium text-foreground">Quick setup</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Start taking payments in minutes</p>
                </div>
                <div className="text-center">
                  <CreditCard className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                  <p className="text-xs font-medium text-foreground">Get paid fast</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Funds in 1-2 business days</p>
                </div>
                <div className="text-center">
                  <ShieldCheck className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                  <p className="text-xs font-medium text-foreground">Simple pricing</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">No surprise fees, ever</p>
                </div>
              </div>
            )}

            {signupStep === 1 ? (
              <form onSubmit={handleSignupStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Enter your email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 bg-background border-border" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Create a password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 bg-background border-border" required minLength={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <CountrySelect value={country} onValueChange={setCountry} />
                </div>

                <p className="text-[10px] text-muted-foreground">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>

                <Button type="submit" className="w-full gap-2" size="lg">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignupStep2} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => setSignupStep(1)} className="text-xs text-primary hover:underline">← Back</button>
                  <span className="text-xs text-muted-foreground">Step 2 of 2</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="full-name" placeholder="Your full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-9 bg-background border-border" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-9 bg-background border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="business-name" placeholder="Your business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="pl-9 bg-background border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={businessCurrency} onValueChange={setBusinessCurrency}>
                    <SelectTrigger className="bg-background border-border">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD – United States Dollar</SelectItem>
                      <SelectItem value="CAD">CAD – Canadian Dollar</SelectItem>
                      <SelectItem value="EUR">EUR – Euro</SelectItem>
                      <SelectItem value="GBP">GBP – British Pound</SelectItem>
                      <SelectItem value="BRL">BRL – Brazilian Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Already have an account? <span className="text-primary font-medium">Sign in</span>
              </Link>
            </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
