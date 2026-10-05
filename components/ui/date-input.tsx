'use client'

import React, { useState, useEffect, useRef } from 'react'
import { parseDateInput, formatDateForInput } from '@/lib/utils/date'

export interface DateInputProps {
  id?: string
  name?: string
  value?: string | null
  defaultValue?: string | null
  onChange?: (isoValue: string, displayValue: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  containerClassName?: string
  error?: string
}

export function DateInput({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  onBlur,
  placeholder = 'DD/MM/YYYY',
  required = false,
  disabled = false,
  className = '',
  containerClassName = '',
  error: externalError,
}: DateInputProps) {
  // Determine initial display (DD/MM/YYYY) and ISO (YYYY-MM-DD)
  const initialIso = controlledValue ?? defaultValue ?? ''
  const initialDisplay = formatDateForInput(initialIso)

  const [displayValue, setDisplayValue] = useState<string>(initialDisplay)
  const [isoValue, setIsoValue] = useState<string>(
    initialIso ? parseDateInput(initialIso) || '' : ''
  )
  const [internalError, setInternalError] = useState<string | null>(null)
  const nativePickerRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // Sync with controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      if (!controlledValue) {
        setDisplayValue('')
        setIsoValue('')
        setInternalError(null)
      } else {
        const parsed = parseDateInput(controlledValue)
        if (parsed) {
          setIsoValue(parsed)
          setDisplayValue(formatDateForInput(parsed))
          setInternalError(null)
        } else {
          // If controlledValue is already invalid or custom
          setDisplayValue(controlledValue)
        }
      }
    }
  }, [controlledValue])

  // Handle typing with auto-masking (DD/MM/YYYY)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    // If user is clearing
    if (!rawVal) {
      setDisplayValue('')
      setIsoValue('')
      setInternalError(null)
      onChange?.('', '')
      return
    }

    // Allow only digits and slashes
    const cleanDigits = rawVal.replace(/[^\d]/g, '')
    
    // Auto-insert slashes as user types numbers
    let formatted = ''
    if (cleanDigits.length <= 2) {
      formatted = cleanDigits
    } else if (cleanDigits.length <= 4) {
      formatted = `${cleanDigits.slice(0, 2)}/${cleanDigits.slice(2)}`
    } else {
      formatted = `${cleanDigits.slice(0, 2)}/${cleanDigits.slice(2, 4)}/${cleanDigits.slice(4, 8)}`
    }

    setDisplayValue(formatted)

    // Validate if 10 characters (DD/MM/YYYY)
    if (formatted.length === 10) {
      const parsedIso = parseDateInput(formatted)
      if (parsedIso) {
        setIsoValue(parsedIso)
        setInternalError(null)
        onChange?.(parsedIso, formatted)
      } else {
        setIsoValue('')
        setInternalError('Tanggal tidak valid (DD/MM/YYYY)')
        onChange?.('', formatted)
      }
    } else {
      // Incomplete date
      setIsoValue('')
      setInternalError(null)
      onChange?.('', formatted)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e)
    if (displayValue && displayValue.length > 0) {
      const parsed = parseDateInput(displayValue)
      if (!parsed) {
        setInternalError('Format tanggal harus DD/MM/YYYY yang valid.')
      } else {
        setInternalError(null)
        // Ensure consistent DD/MM/YYYY formatting on blur
        setDisplayValue(formatDateForInput(parsed))
        setIsoValue(parsed)
      }
    } else if (required) {
      setInternalError('Tanggal wajib diisi.')
    } else {
      setInternalError(null)
    }
  }

  // Handle date selection from calendar picker popup
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedYmd = e.target.value // native input returns YYYY-MM-DD
    if (pickedYmd) {
      const formatted = formatDateForInput(pickedYmd)
      setDisplayValue(formatted)
      setIsoValue(pickedYmd)
      setInternalError(null)
      onChange?.(pickedYmd, formatted)
    }
  }

  const openDatePicker = () => {
    if (disabled) return
    if (nativePickerRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          nativePickerRef.current.showPicker()
        } else {
          nativePickerRef.current.focus()
          nativePickerRef.current.click()
        }
      } catch {
        nativePickerRef.current.click()
      }
    }
  }

  const activeError = externalError || internalError

  // Sync HTML5 custom validity so native form submission stops on invalid dates
  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.setCustomValidity(activeError || '')
    }
  }, [activeError])

  return (
    <div className={`relative w-full ${containerClassName}`}>
      {/* Hidden input carrying standard ISO YYYY-MM-DD for form submit */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={isoValue}
        />
      )}

      {/* Hidden native date input for calendar picker integration */}
      <input
        type="date"
        ref={nativePickerRef}
        value={isoValue}
        onChange={handleNativePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none absolute -bottom-1 left-0 h-0 w-0 opacity-0"
      />

      {/* Visible formatted text input */}
      <div className="relative">
        <input
          ref={textInputRef}
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={10}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className={`block w-full rounded-lg border bg-white py-2 pl-3 pr-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500 transition-colors ${
            activeError
              ? 'border-red-400 text-red-900 focus:border-red-500 focus:ring-red-400/20'
              : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
          } ${className}`}
        />

        {/* Calendar Picker Trigger Icon */}
        <button
          type="button"
          onClick={openDatePicker}
          disabled={disabled}
          title="Pilih tanggal dari kalender"
          aria-label="Pilih tanggal dari kalender"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {/* Inline Validation Error */}
      {activeError && (
        <p className="mt-1 text-xs text-red-600">{activeError}</p>
      )}
    </div>
  )
}

export default DateInput
