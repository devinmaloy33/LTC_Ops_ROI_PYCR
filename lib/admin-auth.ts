import { getChatGPTUser } from '@/app/chatgpt-auth';

export const DEFAULT_ADMIN_EMAIL = 'devin.maloy@gmail.com';

export function configuredAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

export async function getAdminAuthorization() {
  const user = await getChatGPTUser();
  if (!user) return { authorized: false as const, status: 401 as const, user: null };
  if (user.email.trim().toLowerCase() !== configuredAdminEmail()) {
    return { authorized: false as const, status: 403 as const, user };
  }
  return { authorized: true as const, status: 200 as const, user };
}
