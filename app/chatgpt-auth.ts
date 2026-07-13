import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type ChatGPTUser = { displayName: string; email: string; fullName: string | null };

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get('oai-authenticated-user-email');
  if (!email) return null;
  const encodedFullName = requestHeaders.get('oai-authenticated-user-full-name');
  const fullName = encodedFullName && requestHeaders.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8'
    ? safeDecodeURIComponent(encodedFullName)
    : null;
  return { displayName: fullName ?? email, email, fullName };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
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
    if (['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].includes(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function safeDecodeURIComponent(value: string): string | null {
  try { return decodeURIComponent(value); } catch { return null; }
}
