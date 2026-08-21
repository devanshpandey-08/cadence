/**
 * Service layer — the seam between the UI and the backend.
 *
 * In production these calls hit the real API (Node/Express + PostgreSQL + Redis queue):
 *   POST /api/v1/auth/login        → issues a JWT (access 15m + refresh 30d, httpOnly cookie)
 *   POST /api/v1/auth/refresh      → rotates the refresh token
 *   GET  /api/v1/me                → hydrates the session on boot
 *   POST /api/v1/auth/logout       → revokes the refresh token
 *
 * The demo build implements the same contract against the embedded workspace
 * database with simulated network latency, so swapping in `fetch(BASE_URL + …)`
 * is a one-line change per method. Every UI action flows through this layer —
 * nothing in the components talks to storage directly.
 */
import type { Role, User } from '../types';

const SESSION_KEY = 'cadence-session-v2';
export const DEMO_PASSWORD = 'cadence';

const wait = (ms: number) => new Promise<void>(res => window.setTimeout(res, ms));

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export const authApi = {
  /** POST /api/v1/auth/login — validates credentials, issues a session. */
  async login(users: User[], email: string, password: string): Promise<AuthResult> {
    await wait(650 + Math.random() * 350); // simulated network + bcrypt verify
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return { ok: false, error: 'No account found for that email in this workspace.' };
    if (password !== DEMO_PASSWORD) return { ok: false, error: 'Incorrect password. Demo workspaces use "cadence".' };
    try { localStorage.setItem(SESSION_KEY, user.id); } catch { /* private mode */ }
    return { ok: true, user };
  },

  /** GET /api/v1/me — restores the session on boot, if one exists. */
  restore(users: User[]): User | null {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      return users.find(u => u.id === id) ?? null;
    } catch {
      return null;
    }
  },

  /** POST /api/v1/auth/logout — revokes the session. */
  logout(): void {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_SCOPE: Record<Role, string> = {
  admin: 'Full access · billing · user management',
  editor: 'Create, edit, publish · contacts & deals',
  viewer: 'Read-only · calendar, contacts, reports',
};
