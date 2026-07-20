// lib/admin-auth.ts
// Dual-mode admin authentication:
//   1. Primary:  ChatGPT Sites header injection (oai-authenticated-user-email)
//   2. Fallback: HMAC-signed session token cookie (for self-hosted / custom domain deployments)
//
// Required env vars:
//   ADMIN_EMAIL          – the single authorised admin email address
//   ADMIN_JWT_SECRET     – 32+ byte hex secret (generate: openssl rand -hex 32)
//
// The fallback login flow lives at /api/admin/login (POST)
// and issues an HttpOnly cookie named __ltc_admin_token.

import { cookies } from 'next/headers';
import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';

// ── Constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME = '__ltc_admin_token';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the configured admin email, always lower-cased and trimmed.
 * Throws at startup if ADMIN_EMAIL is not set, giving a clear error instead
 * of silently falling back to a hardcoded value.
 */
export function configuredAdminEmail(): string {
  const raw = process.env.ADMIN_EMAIL;
  if (!raw || raw.trim() === '') {
    throw new Error(
      '[admin-auth] ADMIN_EMAIL environment variable is not set. ' +
      'Add it to your .env.local or deployment secrets.'
    );
  }
  return raw.trim().toLowerCase();
}

/**
 * Returns the HMAC secret used to sign standalone admin session tokens.
 * Throws if ADMIN_JWT_SECRET is not set or is too short.
 */
function getHmacSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      '[admin-auth] ADMIN_JWT_SECRET must be at least 32 characters. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  return secret;
}

// ── HMAC token helpers (no third-party JWT library needed) ───────────────────

type TokenPayload = { email: string; exp: number };

function encodePayload(payload: TokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encoded: string): TokenPayload | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    return null;
  }
}

async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const encoded = encodePayload(payload);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(encoded));
  const sigB64 = Buffer.from(sig).toString('base64url');
  return `${encoded}.${sigB64}`;
}

async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sigB64] = parts;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sig = Buffer.from(sigB64, 'base64url');
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(encoded));
  if (!valid) return null;
  const payload = decodePayload(encoded);
  if (!payload) return null;
  if (Date.now() > payload.exp) return null; // expired
  return payload;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type AdminUser = ChatGPTUser & { authMode: 'chatgpt-sites' | 'token' };

/**
 * Issue a signed HttpOnly session cookie for standalone (non-ChatGPT-Sites) deployments.
 * Call this from your POST /api/admin/login route after verifying the passphrase.
 * Returns the cookie string — caller should set it via NextResponse.
 */
export async function issueAdminSessionCookie(email: string): Promise<string> {
  const payload: TokenPayload = { email, exp: Date.now() + TOKEN_TTL_MS };
  const token = await signToken(payload, getHmacSecret());
  // Returns a Set-Cookie header value
  const maxAge = Math.floor(TOKEN_TTL_MS / 1000);
  return `${COOKIE_NAME}=${token}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * Attempt to read a valid standalone session cookie.
 * Returns null if absent, invalid, or expired.
 */
async function getTokenUser(): Promise<AdminUser | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const payload = await verifyToken(raw, getHmacSecret());
    if (!payload) return null;
    return {
      email: payload.email,
      displayName: payload.email,
      fullName: null,
      authMode: 'token',
    };
  } catch {
    return null;
  }
}

/**
 * Dual-mode user resolution.
 * Tries ChatGPT Sites headers first; falls back to HMAC cookie.
 * Returns null when neither source authenticates the request.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  // Mode 1 — ChatGPT Sites
  const oaiUser = await getChatGPTUser();
  if (oaiUser) return { ...oaiUser, authMode: 'chatgpt-sites' };

  // Mode 2 — standalone token cookie
  return getTokenUser();
}

/**
 * Resolve the current admin user and verify they are the configured admin.
 * Returns { authorized, status, user }.
 * Replaces the old getAdminAuthorization() function — same return shape.
 */
export async function getAdminAuthorization(): Promise<
  | { authorized: true;  status: 200; user: AdminUser }
  | { authorized: false; status: 401; user: null }
  | { authorized: false; status: 403; user: AdminUser }
> {
  const user = await getAdminUser();
  if (!user) return { authorized: false as const, status: 401 as const, user: null };

  const isAdmin = user.email.trim().toLowerCase() === configuredAdminEmail();
  if (!isAdmin) return { authorized: false as const, status: 403 as const, user };

  return { authorized: true as const, status: 200 as const, user };
}
