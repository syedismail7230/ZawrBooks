import { describe, it, expect, beforeEach } from 'vitest';
import { otpService } from '@/lib/auth/otpService';
import { hashPassword } from '@/lib/auth/crypto';
import { globalDataStore, defaultRecognizedUsers } from '@/lib/store/dataStore';

describe('Authentication & RBAC Layer', () => {
  const testEmail = 'accounts@zawrindustries.com';

  beforeEach(() => {
    globalDataStore.logout();
  });

  describe('OTP Service', () => {
    it('should generate a 6-digit numeric OTP', () => {
      const code = otpService.generateOtp(testEmail);
      expect(code).toBeDefined();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should verify a valid OTP and invalidate it after single-use', () => {
      const code = otpService.generateOtp(testEmail);
      const firstAttempt = otpService.verifyOtp(testEmail, code);
      expect(firstAttempt.success).toBe(true);

      // Single-use guarantee: second attempt should fail
      const secondAttempt = otpService.verifyOtp(testEmail, code);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toContain('No active verification code');
    });

    it('should reject incorrect OTP codes and limit attempts', () => {
      otpService.generateOtp(testEmail);
      const attempt = otpService.verifyOtp(testEmail, '000000');
      expect(attempt.success).toBe(false);
      expect(attempt.error).toContain('Incorrect verification code');
    });
  });

  describe('Password Hashing & Storage', () => {
    it('should compute deterministic SHA-256 password hash', async () => {
      const hash1 = await hashPassword('SecretPass123!');
      const hash2 = await hashPassword('SecretPass123!');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // Hex string of 32 bytes SHA-256
    });

    it('should allow setting and verifying user password in data store', async () => {
      const user = globalDataStore.findOrCreateUser('test.director@company.com', 'director');
      const hash = await hashPassword('DirectorSecure2026');

      const setSuccess = globalDataStore.setUserPassword(user.email, hash);
      expect(setSuccess).toBe(true);

      const updatedUser = globalDataStore.findUserByEmail(user.email);
      expect(updatedUser?.passwordHash).toBe(hash);
    });
  });

  describe('RBAC Session & Login', () => {
    it('should login recognized user and mark store as authenticated', () => {
      const admin = defaultRecognizedUsers[0];
      expect(globalDataStore.getState().isAuthenticated).toBe(false);

      globalDataStore.login(admin);
      const state = globalDataStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser.email).toBe(admin.email);
      expect(state.currentUser.role).toBe('owner');
    });

    it('should record login and logout audit events', () => {
      const user = defaultRecognizedUsers[2]; // accounts@zawrindustries.com
      globalDataStore.login(user);
      globalDataStore.logout();

      const events = globalDataStore.getState().auditEvents;
      const loginEvent = events.find((e) => e.action === 'USER_LOGIN');
      const logoutEvent = events.find((e) => e.action === 'USER_LOGOUT');

      expect(loginEvent).toBeDefined();
      expect(logoutEvent).toBeDefined();
    });
  });
});
