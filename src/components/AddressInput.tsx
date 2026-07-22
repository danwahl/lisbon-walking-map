import { useEffect, useRef, useState } from 'react'
import { geocode, type GeocodeResult } from '../lib/api.ts'

const DEBOUNCE_MS = 350
const MIN_QUERY_LENGTH = 3

interface AddressInputProps {
  id: string
  label: string
  placeholder: string
  disabled?: boolean
  onSelect: (result: GeocodeResult | null) => void
}

export function AddressInput({ id, label, placeholder, disabled = false, onSelect }: AddressInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Selecting a suggestion sets `query` to its full label, which would
    // otherwise re-trigger this effect and immediately reopen the dropdown
    // with a fresh search right after the user just closed it.
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current
      geocode(query).then((results) => {
        if (requestId !== requestIdRef.current) return // a newer query superseded this one
        setSuggestions(results)
        setIsLoading(false)
        setIsOpen(true)
      })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelect(result: GeocodeResult) {
    justSelectedRef.current = true
    setQuery(result.label)
    setSuggestions([])
    setIsOpen(false)
    onSelect(result)
  }

  function handleChange(value: string) {
    setQuery(value)
    onSelect(null)
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        // Only close when focus leaves the input+dropdown as a whole, so
        // Tabbing from the input into a suggestion button (or clicking one)
        // doesn't unmount it before a keyboard or screen-reader user can
        // activate it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsOpen(false)
        }
      }}
    >
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
      />
      {isLoading && (
        <span className="absolute right-3 top-9 text-xs text-slate-400" aria-hidden="true">
          …
        </span>
      )}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {suggestions.map((s, i) => (
            <li key={`${s.lat},${s.lon},${i}`}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
