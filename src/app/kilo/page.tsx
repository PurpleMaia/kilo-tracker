import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { KiloEntryForm } from '@/components/kilo/kilo-entry-form'

export default function KiloPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-10 gap-8 px-4">
      <div className="w-full max-w-lg">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <h1 className="text-4xl font-bold">KILO Tracker</h1>

      <KiloEntryForm />
    </div>
  )
}
