import { KiloEntryForm } from '@/components/kilo/kilo-entry-form'
import React from 'react'

export default function KiloPage() {
  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-start py-10 gap-8">
      <h1 className="text-4xl font-bold">KILO Tracker</h1>

      <KiloEntryForm />
    </div>
  )
}
