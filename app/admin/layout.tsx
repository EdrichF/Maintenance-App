import { Navbar } from '@/components/ui/Navbar'
import { RealtimeRefresh } from '@/components/ui/RealtimeRefresh'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar role="admin" />
      <RealtimeRefresh tables={['tickets', 'quotes', 'notifications', 'profiles']} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
