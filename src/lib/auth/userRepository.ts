import fs from 'fs';
import path from 'path';
import { UserRole } from '@/types';

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
  passwordHash?: string;
  lastLoginAt?: string;
  createdAt: string;
}

const INITIAL_ORGANIZATION_USERS: UserRecord[] = [
  {
    id: 'usr-ceo',
    email: 'ceo@zawrindustries.com',
    fullName: 'Syed Ismail Zabiulla',
    role: 'owner', // Full Super Admin Rights
    department: 'Director',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-md',
    email: 'md@zawrindustries.com',
    fullName: 'Mohammed Ahmed',
    role: 'director',
    department: 'Director',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-finance',
    email: 'accounts@zawrindustries.com',
    fullName: 'Zawr Finance Accounts',
    role: 'finance_admin',
    department: 'Corporate Finance',
    createdAt: new Date().toISOString(),
  },
];

class UserRepository {
  private users: Map<string, UserRecord> = new Map();
  private storageFile: string;

  constructor() {
    this.storageFile = path.join(process.cwd(), '.data', 'users.json');
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedHashes = new Map<string, { passwordHash?: string; lastLoginAt?: string }>();
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const list: UserRecord[] = JSON.parse(raw);
          for (const u of list) {
            if (u.passwordHash || u.lastLoginAt) {
              savedHashes.set(u.email.toLowerCase(), {
                passwordHash: u.passwordHash,
                lastLoginAt: u.lastLoginAt,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[USER REPOSITORY] Could not read local user storage:', e);
    }

    // Set strictly the 3 authorized organization accounts
    this.users.clear();
    for (const initUser of INITIAL_ORGANIZATION_USERS) {
      const saved = savedHashes.get(initUser.email.toLowerCase());
      this.users.set(initUser.email.toLowerCase(), {
        ...initUser,
        passwordHash: saved?.passwordHash || initUser.passwordHash,
        lastLoginAt: saved?.lastLoginAt || initUser.lastLoginAt,
      });
    }

    this.persist();
  }

  private persist() {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const list = Array.from(this.users.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('[USER REPOSITORY] Failed to persist users:', e);
    }
  }

  public findByEmail(email: string): UserRecord | null {
    if (!email) return null;
    return this.users.get(email.trim().toLowerCase()) || null;
  }

  public findById(id: string): UserRecord | null {
    for (const u of this.users.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  public findOrCreate(
    email: string,
    fullName?: string,
    role?: UserRole
  ): UserRecord {
    const normalized = email.trim().toLowerCase();
    const existing = this.users.get(normalized);
    if (existing) {
      return existing;
    }

    const namePart = normalized.split('@')[0];
    const derivedName =
      fullName ||
      namePart
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    let derivedRole: UserRole = role || 'accountant';
    if (
      normalized.includes('admin') ||
      normalized.includes('ceo') ||
      normalized.includes('ismail')
    ) {
      derivedRole = 'owner';
    } else if (
      normalized.includes('director') ||
      normalized.includes('md')
    ) {
      derivedRole = 'director';
    } else if (
      normalized.includes('finance') ||
      normalized.includes('accounts')
    ) {
      derivedRole = 'finance_admin';
    } else if (
      normalized.includes('employee') ||
      normalized.includes('staff')
    ) {
      derivedRole = 'employee';
    } else if (normalized.includes('audit')) {
      derivedRole = 'auditor';
    }

    const newUser: UserRecord = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: normalized,
      fullName: derivedName,
      role: derivedRole,
      department:
        derivedRole === 'owner' || derivedRole === 'director'
          ? 'Executive Management'
          : 'Corporate Finance',
      createdAt: new Date().toISOString(),
    };

    this.users.set(normalized, newUser);
    this.persist();
    return newUser;
  }

  public setPassword(email: string, passwordHash: string): boolean {
    const user = this.findByEmail(email);
    if (!user) return false;
    user.passwordHash = passwordHash;
    this.persist();
    return true;
  }

  public updateLastLogin(email: string): void {
    const user = this.findByEmail(email);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      this.persist();
    }
  }

  public getAll(): UserRecord[] {
    return Array.from(this.users.values());
  }
}

export const userRepository = new UserRepository();
