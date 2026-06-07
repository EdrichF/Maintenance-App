import { Navbar } from '@/components/ui/Navbar'
import { RealtimeRefresh } from '@/components/ui/RealtimeRefresh'

export default function RegionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar role="regional" />
      <RealtimeRefresh tables={['tickets', 'quotes', 'notifications', 'completions']} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
