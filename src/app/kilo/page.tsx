import { KiloEntryForm } from '@/components/kilo/kilo-entry-form'

export default function KiloPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-10 gap-8 px-4">
      <h1 className="text-4xl font-bold">KILO Tracker</h1>

      <KiloEntryForm />
    </div>
  )
}
