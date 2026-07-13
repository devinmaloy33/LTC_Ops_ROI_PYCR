import Link from 'next/link';
import { requireChatGPTUser, chatGPTSignOutPath } from '@/app/chatgpt-auth';
import AdminDashboard from '@/components/admin-dashboard';
import { configuredAdminEmail } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireChatGPTUser('/admin');
  const isAdmin = user.email.trim().toLowerCase() === configuredAdminEmail();

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <img src="/paycor-empowering-leaders.png" alt="Paycor Empowering Leaders" className="h-12 w-auto object-contain object-left" />
          <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-paycor-orange">Private administration</p>
          <h1 className="mt-3 text-2xl font-black text-paycor-charcoal">Administrator access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-paycor-medium-grey">
            This account is signed in, but it is not authorized to view facility activity or outreach campaigns.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={chatGPTSignOutPath('/admin')} className="rounded-xl bg-paycor-charcoal px-4 py-2.5 text-xs font-extrabold text-white">Use another account</a>
            <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-paycor-medium-grey">Return to calculator</Link>
          </div>
        </section>
      </main>
    );
  }

  return <AdminDashboard userName={user.displayName} userEmail={user.email} signOutPath={chatGPTSignOutPath('/')} />;
}
