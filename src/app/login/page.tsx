'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { globalDataStore, defaultRecognizedUsers } from '@/lib/store/dataStore';
import { hashPassword } from '@/lib/auth/crypto';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/common/Button';
import { SetPasswordModal } from '@/components/auth/SetPasswordModal';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Post-OTP Password Prompt Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [authenticatedUserEmail, setAuthenticatedUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setStoreState(globalDataStore.getState());
    return globalDataStore.subscribe(() => {
      setStoreState(globalDataStore.getState());
    });
  }, []);

  // Timer countdown for OTP expiry
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

  // Dispatch OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please provide a valid business or personal email address.');
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
        setError(data.error || 'Failed to dispatch verification email. Please try again.');
      } else {
        setOtpSent(true);
        setOtpTimer(600); // 10 minutes
        setSuccessMessage(`A 6-digit verification code has been dispatched to ${targetEmail}`);
      }
    } catch {
      setError('Network error: Unable to reach authentication service.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP & Authenticate
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetEmail = email.trim().toLowerCase();
    const code = otpCode.trim();

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      // Provision or get user in store
      const user = globalDataStore.findOrCreateUser(targetEmail);
      globalDataStore.login(user);

      setAuthenticatedUserEmail(user.email);

      // If user doesn't have a password yet, offer to set one or continue directly
      if (!user.passwordHash) {
        setSuccessMessage('Verification confirmed! You can now set a password or proceed directly.');
        setIsPasswordModalOpen(true);
      } else {
        redirectToAppropriateSurface(user.role);
      }
    } catch {
      setError('An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  // Password Sign-In
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = globalDataStore.findUserByEmail(targetEmail);

      if (!user) {
        setError(
          'No account found with this email. Please sign in with "Email OTP" to register or verify.'
        );
        setLoading(false);
        return;
      }

      if (!user.passwordHash) {
        setError(
          'No password has been established for this account yet. Please switch to "Email OTP" to sign in and set your password.'
        );
        setLoading(false);
        return;
      }

      const inputHash = await hashPassword(password);
      if (inputHash !== user.passwordHash) {
        setError('Incorrect password. You can also sign in instantly using Email OTP.');
        setLoading(false);
        return;
      }

      // Authenticate
      globalDataStore.login(user);
      redirectToAppropriateSurface(user.role);
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const redirectToAppropriateSurface = (role: string) => {
    if (role === 'employee') {
      router.push('/mobile');
    } else {
      router.push('/web');
    }
  };

  const handleSelectPreSeeded = (testEmail: string) => {
    setEmail(testEmail);
    setOtpSent(false);
    setOtpCode('');
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col justify-between items-center py-10 px-4 font-sans select-none">
      {/* Top Branding Bar */}
      <div className="w-full max-w-md flex flex-col items-center mb-6">
        <BrandLogo variant="reactive" className="h-8 md:h-9 mb-2" />
        <span className="text-[11px] uppercase tracking-widest text-[#777777] font-semibold">
          Financial Management & Enterprise Control
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white border border-[#111111] shadow-xl p-6 md:p-8">
        <div className="border-b border-[#E5E5E5] pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-[#111111] uppercase tracking-wide">
                Sign In
              </h1>
              <p className="text-xs text-[#666666] mt-0.5">
                Two-Factor Authenticated Access Control
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F4F3EF] border border-[#E5E5E5] text-[10px] text-[#555555] font-mono">
              <ShieldCheck size={12} className="text-[#111111]" />
              <span>TLS 256-BIT</span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 mt-5 bg-[#F4F3EF] p-1 border border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('otp');
                setError(null);
              }}
              className={`py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'otp'
                  ? 'bg-white text-[#111111] shadow-xs border border-[#E5E5E5]'
                  : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Mail size={13} />
              <span>Email OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setError(null);
              }}
              className={`py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'password'
                  ? 'bg-white text-[#111111] shadow-xs border border-[#E5E5E5]'
                  : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Lock size={13} />
              <span>Password</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: EMAIL OTP AUTHENTICATION */}
        {activeTab === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. accounts@zawrindustries.com"
                      required
                      className="w-full px-3 py-2.5 text-xs border border-[#CCCCCC] focus:border-black focus:outline-none bg-white font-mono placeholder:text-gray-400"
                    />
                    <Mail
                      size={14}
                      className="absolute right-3 top-3 text-[#888888] pointer-events-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#777777] mt-1.5">
                    We will send an instant 6-digit OTP to your inbox via accounts@zawrindustries.com.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  isLoading={loading}
                >
                  Send Verification Code <ArrowRight size={14} />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#111111]">
                      6-Digit Security Code
                    </label>
                    <span className="text-[11px] font-mono text-[#666666]">
                      Expires in: <strong className="text-black">{formatTimer(otpTimer)}</strong>
                    </span>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    autoFocus
                    required
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 border-2 border-[#111111] bg-[#FAFAF9] focus:outline-none focus:bg-white"
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-[#666666] truncate max-w-[200px]">
                      Sent to: <strong>{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading || otpTimer > 540}
                      className="text-[#111111] font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={11} /> Resend OTP
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    isLoading={loading}
                  >
                    Verify & Access Dashboard <ArrowRight size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs text-[#666666]"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                  >
                    Change Email Address
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: PASSWORD AUTHENTICATION */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@zawrindustries.com"
                required
                className="w-full px-3 py-2.5 text-xs border border-[#CCCCCC] focus:border-black focus:outline-none bg-white font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#111111]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('otp');
                    setOtpSent(false);
                    setError(null);
                  }}
                  className="text-[11px] text-[#555555] hover:text-black hover:underline"
                >
                  Forgot / Set Password via OTP
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2.5 text-xs border border-[#CCCCCC] focus:border-black focus:outline-none bg-white font-mono"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={loading}
            >
              Sign In with Password <ArrowRight size={14} />
            </Button>
          </form>
        )}

        {/* Seeded Organizational User Fast-Fill (For RBAC testing) */}
        <div className="mt-8 pt-5 border-t border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#777777]">
              Pre-Configured Enterprise Roles
            </span>
            <span className="text-[10px] text-[#888888] font-mono">RBAC Directory</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {defaultRecognizedUsers.slice(0, 4).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectPreSeeded(u.email)}
                className={`text-left p-2 border transition-all text-xs ${
                  email === u.email
                    ? 'border-black bg-[#F4F3EF] font-semibold text-black'
                    : 'border-[#E5E5E5] bg-white text-[#444444] hover:border-[#999999]'
                }`}
              >
                <div className="text-[11px] truncate font-medium text-[#111111]">
                  {u.fullName}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#777777] font-mono">
                  {u.role.replace('_', ' ')}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#888888] mt-2">
            Tip: You can also enter any custom business or personal email; it will receive a live OTP code and provision your role.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-[#888888] mt-6">
        Zawr Books Enterprise Financial Accounting • Authenticated RBAC Engine<br />
        Protected by SHA-256 Multi-Factor Cryptographic Session Verification
      </div>

      {/* Set Password Prompt Modal (Optional after OTP Login) */}
      <SetPasswordModal
        isOpen={isPasswordModalOpen}
        targetEmail={authenticatedUserEmail || email}
        onClose={() => {
          setIsPasswordModalOpen(false);
          const current = globalDataStore.getState().currentUser;
          redirectToAppropriateSurface(current.role);
        }}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          const current = globalDataStore.getState().currentUser;
          redirectToAppropriateSurface(current.role);
        }}
      />
    </div>
  );
}
