import Image from 'next/image'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Brand Header with Wordmark Logo */}
        <div className="mb-6 flex items-center justify-center rounded-xl bg-slate-900 px-6 py-4">
          <Image
            src="/img/wordmark-white-yellow.png"
            alt="REDIGMA"
            width={160}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Portal Human Capital</h1>
          <p className="mt-1 text-xs text-gray-500">
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
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Email Petugas
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nama@redigma.id"
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Masuk ke Sistem
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          REDIGMA &bull; Human Capital Magang Capstone
        </div>
      </div>
    </main>
  )
}
