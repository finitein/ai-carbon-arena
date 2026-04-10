// ============================================================
// Auth Service — JWT-based human player authentication
// ============================================================

import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { users } from '../db/sqlite-schema';

const JWT_SECRET = process.env.JWT_SECRET || 'csa-dev-secret-do-not-use-in-prod';
const JWT_EXPIRES_IN = '7d';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  rating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: UserProfile;
}

export class AuthService {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  /** Register a new human player */
  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AuthError('INVALID_EMAIL', '邮箱格式不正确');
    }

    // Validate password
    if (password.length < 6) {
      throw new AuthError('WEAK_PASSWORD', '密码至少需要 6 个字符');
    }

    // Validate display name
    if (!displayName || displayName.length < 2 || displayName.length > 32) {
      throw new AuthError('INVALID_NAME', '显示名称需 2-32 个字符');
    }

    // Check if email is taken
    const existing = this.db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      throw new AuthError('EMAIL_EXISTS', '该邮箱已被注册');
    }

    // Create user
    const id = this.generateUUID();
    const passwordHash = this.hashPassword(password);
    const now = new Date().toISOString();

    this.db.insert(users).values({
      id,
      email,
      passwordHash,
      displayName,
      rating: 1500,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      isBanned: false,
      createdAt: now,
      updatedAt: now,
    }).run();

    const user: UserProfile = {
      id,
      email,
      displayName,
      rating: 1500,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: now,
    };

    const token = this.signToken(user);
    return { token, user };
  }

  /** Login with email and password */
  async login(email: string, password: string): Promise<AuthResult> {
    const row = this.db.select().from(users).where(eq(users.email, email)).get();
    if (!row) {
      throw new AuthError('INVALID_CREDENTIALS', '邮箱或密码错误');
    }

    if (row.isBanned) {
      throw new AuthError('ACCOUNT_BANNED', '该账号已被封禁');
    }

    if (!this.verifyPassword(password, row.passwordHash)) {
      throw new AuthError('INVALID_CREDENTIALS', '邮箱或密码错误');
    }

    const user: UserProfile = {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      rating: row.rating,
      totalGames: row.totalGames,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      createdAt: row.createdAt,
    };

    const token = this.signToken(user);
    return { token, user };
  }

  /** Verify a JWT token and return user profile */
  verifyToken(token: string): UserProfile | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const row = this.db.select().from(users).where(eq(users.id, payload.userId)).get();
      if (!row || row.isBanned) return null;

      return {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        rating: row.rating,
        totalGames: row.totalGames,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        createdAt: row.createdAt,
      };
    } catch {
      return null;
    }
  }

  /** Get user by ID */
  getUserById(userId: string): UserProfile | null {
    const row = this.db.select().from(users).where(eq(users.id, userId)).get();
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      rating: row.rating,
      totalGames: row.totalGames,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      createdAt: row.createdAt,
    };
  }

  // --- Internal helpers ---

  private signToken(user: UserProfile): string {
    return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(password + salt).digest('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const computed = createHash('sha256').update(password + salt).digest('hex');
    return computed === hash;
  }

  private generateUUID(): string {
    return randomBytes(16)
      .toString('hex')
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  }
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}
