import { useState } from 'react'
import { AddressInput } from './AddressInput.tsx'
import type { GeocodeResult } from '../lib/api.ts'

interface AddressFormProps {
  onSubmit: (origin: GeocodeResult, destination: GeocodeResult) => void
  isLoading: boolean
}

export function AddressForm({ onSubmit, isLoading }: AddressFormProps) {
  const [origin, setOrigin] = useState<GeocodeResult | null>(null)
  const [destination, setDestination] = useState<GeocodeResult | null>(null)

  const canSubmit = origin !== null && destination !== null && !isLoading

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (origin && destination) onSubmit(origin, destination)
      }}
      className="flex flex-col gap-4"
    >
      <AddressInput
        id="origin"
        label="From"
        placeholder="e.g. Praça do Comércio, Lisboa"
        disabled={isLoading}
        onSelect={setOrigin}
      />
      <AddressInput
        id="destination"
        label="To"
        placeholder="e.g. Castelo de São Jorge, Lisboa"
        disabled={isLoading}
        onSelect={setDestination}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        {isLoading ? 'Finding route…' : 'Get route'}
      </button>
      {!canSubmit && !isLoading && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select both addresses from the suggestions to get a route.
        </p>
      )}
    </form>
  )
}
