// app/api/admin/login/route.ts
// Standalone admin login endpoint for non-ChatGPT-Sites deployments.
//
// POST /api/admin/login
// Body (JSON): { email: string; passphrase: string }
//
// On success: sets HttpOnly signed session cookie and redirects to /admin
// On failure: returns 401 JSON
//
// Required env vars:
//   ADMIN_EMAIL        – authorised admin email
//   ADMIN_PASSPHRASE   – bcrypt-hashed passphrase (or plaintext for dev only)
//   ADMIN_JWT_SECRET   – HMAC signing secret (min 32 chars)

import { NextRequest, NextResponse } from 'next/server';
import { configuredAdminEmail, issueAdminSessionCookie } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ── Constant-time string comparison to prevent timing attacks ────────────────
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  // Always compare max-length to avoid length leakage
  if (aBytes.length !== bBytes.length) {
    // Still run comparison against itself to keep constant time
    let diff = 0;
    for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ aBytes[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Parse body ───────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  const { email, passphrase } = body as Record<string, unknown>;

  if (typeof email !== 'string' || typeof passphrase !== 'string') {
    return NextResponse.json({ error: 'email and passphrase are required strings.' }, { status: 400 });
  }

  // ── 2. Validate credentials ────────────────────────────────────────────────
  const expectedEmail = configuredAdminEmail();
  const expectedPassphrase = process.env.ADMIN_PASSPHRASE ?? '';

  if (!expectedPassphrase) {
    console.error('[admin/login] ADMIN_PASSPHRASE env var is not set.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 503 });
  }

  const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail);
  const passphraseOk = safeEqual(passphrase, expectedPassphrase);

  if (!emailOk || !passphraseOk) {
    // Generic message — do not hint at which field was wrong
    return NextResponse.json(
      { error: 'Invalid credentials.' },
      { status: 401 }
    );
  }

  // ── 3. Issue session cookie ────────────────────────────────────────────────
  const setCookieValue = await issueAdminSessionCookie(email.trim().toLowerCase());

  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  response.headers.set('Set-Cookie', setCookieValue);
  return response;
}

// Disallow all other methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
