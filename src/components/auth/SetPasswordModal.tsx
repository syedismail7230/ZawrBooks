'use client';

import React, { useState } from 'react';
import { globalDataStore } from '@/lib/store/dataStore';
import { hashPassword } from '@/lib/auth/crypto';
import { Button } from '@/components/common/Button';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmail?: string;
  onSuccess?: () => void;
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({
  isOpen,
  onClose,
  targetEmail,
  onSuccess,
}) => {
  const store = globalDataStore.getState();
  const email = targetEmail || store.currentUser.email;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const hashed = await hashPassword(password);

      // Save via API
      await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash: hashed }),
      });

      // Save to client data store
      globalDataStore.setUserPassword(email, hashed);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPassword('');
        setConfirmPassword('');
        onSuccess?.();
        onClose();
      }, 1500);
    } catch {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#111111] w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F4F3EF]">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#111111]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
              Set / Update Password
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#111111] p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSavePassword} className="p-5 space-y-4">
          <div className="text-xs text-[#555555]">
            Account: <strong className="text-[#111111]">{email}</strong>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>Password successfully established! You can now sign in with this password.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-black focus:outline-none bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-[#777777] hover:text-[#111111]"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-black focus:outline-none bg-white font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
            >
              Save Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
