import { Activity } from "lucide-react";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--hh-soft)] px-5">
      <section className="hh-panel w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--hh-purple)] text-white">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Harmony Health</h1>
            <p className="text-sm text-[#66736d]">Sign in to the clinic workspace</p>
          </div>
        </div>

        {params.error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            Invalid username or password.
          </div>
        )}

        <form action="/api/auth/login" method="post" className="grid gap-4">
          <label>
            <span className="hh-label">Username</span>
            <input className="hh-input" name="username" autoComplete="username" required />
          </label>
          <label>
            <span className="hh-label">Password</span>
            <input className="hh-input" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="hh-button" type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
