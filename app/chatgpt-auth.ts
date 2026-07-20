// app/chatgpt-auth.ts
// Reads user identity from ChatGPT Sites injected headers.
// On non-ChatGPT-Sites deployments (e.g. ltcroi.com), getChatGPTUser() returns
// null and the caller should fall back to the HMAC cookie path in lib/admin-auth.ts.

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type ChatGPTUser = { displayName: string; email: string; fullName: string | null };

/**
 * Read the ChatGPT Sites authenticated user from injected request headers.
 * Returns null when running outside of ChatGPT Sites (no headers present).
 */
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get('oai-authenticated-user-email');
  if (!email) return null;
  const encodedFullName = requestHeaders.get('oai-authenticated-user-full-name');
  const fullName =
    encodedFullName &&
    requestHeaders.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8'
      ? safeDecodeURIComponent(encodedFullName)
      : null;
  return { displayName: fullName ?? email, email, fullName };
}

/**
 * Require a ChatGPT Sites authenticated user.
 *
 * Behaviour by deployment context:
 *   - ChatGPT Sites: redirects to ChatGPT sign-in if no user header present.
 *   - Custom domain (ltcroi.com): redirects to the standalone /admin/login page.
 *
 * Callers inside the /admin route tree should use getAdminAuthorization() from
 * lib/admin-auth.ts instead, which handles both auth modes transparently.
 */
export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  // Detect whether we are inside ChatGPT Sites by checking for the
  // presence of any OAI header (even a non-auth one).
  const requestHeaders = await headers();
  const isOnChatGPTSites = requestHeaders.has('oai-conversation-id') ||
    requestHeaders.has('oai-authenticated-user-email');

  if (isOnChatGPTSites) {
    // ChatGPT Sites is present but no user — send to ChatGPT sign-in
    redirect(chatGPTSignInPath(returnTo));
  } else {
    // Self-hosted / custom domain — send to the standalone login page
    redirect(`/admin/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
  }
}

export function chatGPTSignInPath(returnTo: string): string {
  return `/signin-with-chatgpt?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = '/'): string {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local') return '/';
    if (['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback', '/admin/login'].includes(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
