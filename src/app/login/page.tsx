'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { globalDataStore } from '@/lib/store/dataStore';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/common/Button';
import { SetPasswordModal } from '@/components/auth/SetPasswordModal';
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

type AuthMode = 'password' | 'otp';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('from') || '/web';

  const [authMode, setAuthMode] = useState<AuthMode>('password');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [noPasswordPrompt, setNoPasswordPrompt] = useState(false);

  // Post-OTP Password Setup
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);
    setNoPasswordPrompt(false);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !password) {
      setError('Please enter both your work email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'NO_PASSWORD_SET') {
          setNoPasswordPrompt(true);
          setError(data.message);
        } else {
          setError(data.message || 'Invalid email or password.');
        }
        setLoading(false);
        return;
      }

      // Sync local state and redirect
      if (data.user) {
        globalDataStore.login(data.user);
      }
      router.replace(returnUrl);
    } catch {
      setError('Network connection error. Please verify your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Request OTP Code
  const handleSendOtp = async (customEmail?: string) => {
    setError(null);
    setInfoNotice(null);
    setNoPasswordPrompt(false);

    const targetEmail = (customEmail || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please provide a valid work email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Failed to dispatch verification code. Please try again.');
      } else {
        setAuthMode('otp');
        setOtpSent(true);
        setOtpTimer(600); // 10 minutes
        setOtpCode(['', '', '', '', '', '']);
        setInfoNotice(`A 6-digit verification code has been dispatched to ${targetEmail}`);
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 100);
      }
    } catch {
      setError('Network error: Unable to contact authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // 3. OTP Code Input Handling (6 digits with auto-focus)
  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of full 6-digit code
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const nextDigits = [...otpCode];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = pasted[i] || '';
        }
        setOtpCode(nextDigits);
        const focusIndex = Math.min(pasted.length, 5);
        otpInputsRef.current[focusIndex]?.focus();
      }
      return;
    }

    const cleanChar = value.replace(/\D/g, '');
    const next = [...otpCode];
    next[index] = cleanChar;
    setOtpCode(next);

    if (cleanChar && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // 4. Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);

    const targetEmail = email.trim().toLowerCase();
    const fullCode = otpCode.join('');

    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: fullCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      if (data.user) {
        globalDataStore.login(data.user);
      }

      // If user hasn't set up a password yet, offer password setup
      if (!data.hasPassword) {
        setVerifiedEmail(targetEmail);
        setIsPasswordModalOpen(true);
      } else {
        router.replace(returnUrl);
      }
    } catch {
      setError('An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F6] flex flex-col justify-between items-center py-12 px-4 font-sans select-none">
      {/* Top Brand Header */}
      <div className="w-full max-w-sm flex flex-col items-center mb-6">
        <BrandLogo variant="reactive" className="h-8 md:h-9 mb-2" />
        <span className="text-[11px] uppercase tracking-wider text-[#777777] font-semibold">
          Financial Management & Control
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white border border-[#E0E0DF] shadow-md p-7 md:p-9">
        {/* Header Title */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-[#111111] tracking-tight">
            {authMode === 'password'
              ? 'Sign in to your account'
              : otpSent
              ? 'Enter verification code'
              : 'Passwordless Sign-In'}
          </h1>
          <p className="text-xs text-[#666666] mt-1">
            {authMode === 'password'
              ? 'Enter your work email and password to access the portal'
              : otpSent
              ? `A 6-digit code was sent to ${email}`
              : 'Sign in with a single-use code sent to your email'}
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <span>{error}</span>
              {noPasswordPrompt && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <button
                    type="button"
                    onClick={() => handleSendOtp(email)}
                    className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
                  >
                    Send One-Time Code to {email} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success / Notice Feedback */}
        {infoNotice && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* MODE 1: PASSWORD AUTHENTICATION (DEFAULT ENTERPRISE STANDARD) */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  className="w-full px-3.5 py-2.5 text-xs border border-[#CCCCCC] focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-white font-mono placeholder:text-gray-400 transition-colors"
                />
                <Mail size={14} className="absolute right-3.5 top-3.5 text-[#888888] pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#222222]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp');
                    setOtpSent(false);
                    setError(null);
                    setInfoNotice(null);
                  }}
                  className="text-[11px] text-[#555555] hover:text-black hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full px-3.5 py-2.5 text-xs border border-[#CCCCCC] focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-white font-mono placeholder:text-gray-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#888888] hover:text-[#111111]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center mt-2 py-2.5"
              isLoading={loading}
            >
              Sign In <ArrowRight size={14} />
            </Button>

            {/* Clean Divider & Alternative OTP Access */}
            <div className="pt-3">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#E5E5E5]"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-[#999999] tracking-wider">
                  Or
                </span>
                <div className="flex-grow border-t border-[#E5E5E5]"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setOtpSent(false);
                  setError(null);
                  setInfoNotice(null);
                }}
                className="w-full mt-1 py-2 text-xs font-medium text-[#444444] hover:text-black border border-[#D5D5D4] hover:border-black bg-white hover:bg-[#FAFAF9] transition-all flex items-center justify-center gap-2"
              >
                <KeyRound size={13} />
                <span>Sign in with One-Time Code (Email OTP)</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: EMAIL OTP AUTHENTICATION */}
        {authMode === 'otp' && (
          <div>
            {!otpSent ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendOtp();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      required
                      className="w-full px-3.5 py-2.5 text-xs border border-[#CCCCCC] focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-white font-mono placeholder:text-gray-400"
                    />
                    <Mail size={14} className="absolute right-3.5 top-3.5 text-[#888888] pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-[#777777] mt-1.5">
                    A single-use 6-digit code will be sent to your email inbox.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full justify-center py-2.5"
                  isLoading={loading}
                >
                  Send Verification Code <ArrowRight size={14} />
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('password');
                      setError(null);
                      setInfoNotice(null);
                    }}
                    className="text-xs text-[#666666] hover:text-black hover:underline"
                  >
                    ← Return to password sign-in
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#222222]">
                      6-Digit Code
                    </label>
                    <span className="text-[11px] font-mono text-[#666666]">
                      Expires in: <strong className="text-black">{formatTimer(otpTimer)}</strong>
                    </span>
                  </div>

                  {/* 6 Individual Digit Inputs */}
                  <div className="flex gap-2 justify-between">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-mono font-bold border border-[#BBBBBB] focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-[#FAFAF9] transition-all"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[11px]">
                    <span className="text-[#666666]">Didn&apos;t receive code?</span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading || otpTimer > 540}
                      className="text-black font-semibold hover:underline flex items-center gap-1 disabled:opacity-40 disabled:hover:no-underline"
                    >
                      <RefreshCw size={11} /> Resend Code
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full justify-center py-2.5"
                    isLoading={loading}
                  >
                    Verify & Sign In <ArrowRight size={14} />
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode(['', '', '', '', '', '']);
                      setError(null);
                      setInfoNotice(null);
                    }}
                    className="w-full text-center text-xs text-[#666666] hover:text-black hover:underline py-1"
                  >
                    Use a different email address
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Enterprise Security Legal Footer */}
      <div className="text-center text-[11px] text-[#888888] mt-6 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 font-medium text-[#666666]">
          <ShieldCheck size={13} className="text-[#333333]" />
          <span>Zawr Industries LLP • Unified Enterprise Financial Operating System</span>
        </div>
        <span>Protected by cryptographically signed HTTP-only sessions</span>
      </div>

      {/* Optional Password Setup Modal (Post-OTP for accounts with no password) */}
      <SetPasswordModal
        isOpen={isPasswordModalOpen}
        targetEmail={verifiedEmail || email}
        onClose={() => {
          setIsPasswordModalOpen(false);
          router.replace(returnUrl);
        }}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          router.replace(returnUrl);
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center justify-center p-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E5E5] p-1.5 shadow-sm mb-3">
            <img src="/favicon.png" alt="Zawr Books" className="w-full h-full object-contain" />
          </div>
          <div className="text-xs text-[#666666] font-mono animate-pulse">Initializing Zawr Books session...</div>
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
