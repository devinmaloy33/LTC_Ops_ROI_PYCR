'use client';
// app/admin/login/page.tsx
// Standalone admin login UI for ltcroi.com (non-ChatGPT-Sites deployments).
// Submits credentials to POST /api/admin/login.
// On the ChatGPT Sites hosted version this page is never reached
// because requireChatGPTUser() redirects to the ChatGPT sign-in flow instead.

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), passphrase }),
        redirect: 'follow',
      });

      if (res.ok || res.redirected) {
        // The API redirects to /admin on success; follow it
        window.location.href = res.url || '/admin';
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? 'Login failed. Please try again.');
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Paycor branding */}
        <img
          src="/paycor-empowering-leaders.png"
          alt="Paycor Empowering Leaders"
          className="h-12 w-auto object-contain object-left"
        />

        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-paycor-orange">
          Private workspace
        </p>
        <h1 className="mt-3 text-2xl font-black text-paycor-charcoal">
          LTC Opportunity Dashboard
        </h1>
        <p className="mt-2 text-sm text-paycor-medium-grey">
          Sign in to access outreach activity, campaigns, and call history.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-bold text-paycor-charcoal"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-paycor-charcoal placeholder:text-slate-400 focus:border-paycor-orange focus:outline-none focus:ring-2 focus:ring-paycor-orange/20"
              placeholder="you@paycor.com"
            />
          </div>

          {/* Passphrase */}
          <div>
            <label
              htmlFor="passphrase"
              className="mb-1.5 block text-xs font-bold text-paycor-charcoal"
            >
              Passphrase
            </label>
            <input
              id="passphrase"
              type="password"
              autoComplete="current-password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-paycor-charcoal placeholder:text-slate-400 focus:border-paycor-orange focus:outline-none focus:ring-2 focus:ring-paycor-orange/20"
              placeholder="••••••••••••"
            />
          </div>

          {/* Error */}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-paycor-orange px-4 py-3 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6">
          <Link
            href="/"
            className="text-xs font-semibold text-paycor-medium-grey hover:text-paycor-charcoal"
          >
            ← Return to calculator
          </Link>
        </div>
      </section>
    </main>
  );
}
