import { AuthForm } from '@/components/auth/auth-form'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16">
      <main className="grid w-full max-w-5xl gap-12 rounded-3xl bg-white px-10 py-16 shadow-lg lg:grid-cols-2">
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            OuterCircl · Identity
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-950">
            Passwordless access, powered by Supabase
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600">
            Use a single email form to sign in or create an account. We verify the
            email with a Supabase magic link so you never have to manage passwords.
          </p>
          <ul className="space-y-3 text-sm text-zinc-500">
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Email-first onboarding flow
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Server actions keep credentials off the client
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Works with Supabase proxy session middleware
            </li>
          </ul>
        </section>

        <AuthForm />
      </main>
    </div>
  )
}
