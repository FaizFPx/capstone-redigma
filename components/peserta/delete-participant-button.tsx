'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteParticipantAction } from '@/app/(app)/peserta/actions'

interface DeleteParticipantButtonProps {
  participantId: string
  participantName: string
}

export function DeleteParticipantButton({
  participantId,
  participantName,
}: DeleteParticipantButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleOpen = () => {
    setErrorMessage(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isDeleting) return
    setIsOpen(false)
    setErrorMessage(null)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const res = await deleteParticipantAction(participantId)

      if (res?.error) {
        setErrorMessage(res.error)
        setIsDeleting(false)
        return
      }

      setIsOpen(false)
      router.push('/peserta?success=deleted')
      router.refresh()
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan sistem saat menghapus peserta.'
      )
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-xs hover:bg-red-100 hover:text-red-700 transition-colors"
      >
        <svg
          className="h-4 w-4 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Hapus Peserta
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3
                  id="modal-title"
                  className="text-base font-bold text-gray-900"
                >
                  Hapus Peserta?
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Data peserta ini akan dihapus secara permanen dan kuota pada rincian pengajuan terkait dapat digunakan kembali.
                </p>

                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs">
                  <span className="text-gray-500 block font-medium">Nama Peserta yang akan dihapus:</span>
                  <span className="text-gray-900 font-bold text-sm block mt-0.5">
                    {participantName}
                  </span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-red-500 mt-0.5"
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
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 focus:outline-hidden disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Peserta</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
