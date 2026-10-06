import Image from 'next/image'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/40 px-4 py-8">
      {/* Decorative ambient background glows */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#07569d]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-xs">
        {/* Brand Header with Title Logo */}
        <div className="mb-6 flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#06447e] via-[#07569d] to-[#0a66ba] px-4 py-2.5 shadow-lg shadow-[#07569d]/20 ring-1 ring-white/10">
          <Image
            src="/img/title2.png"
            alt="REDIGMA"
            width={270}
            height={74}
            className="h-20 w-auto object-contain translate-y-1 drop-shadow-xs"
            priority
          />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Portal Human Capital
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sistem Informasi Pengajuan & Pemantauan Magang
          </p>
        </div>

        {params.error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <svg
              className="h-4 w-4 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Email atau password salah. Silakan coba kembali.</span>
          </div>
        )}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Email Petugas
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nama@redigma.id"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[#07569d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07569d]/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[#07569d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07569d]/20"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#07569d] to-[#0a66ba] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#07569d]/25 transition-all duration-200 hover:from-[#064680] hover:to-[#07569d] hover:shadow-lg hover:shadow-[#07569d]/35 active:scale-[0.99] cursor-pointer"
          >
            Masuk ke Sistem
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          REDIGMA &bull; Human Capital Magang Capstone
        </div>
      </div>
    </main>
  )
}
