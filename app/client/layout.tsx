import { Navbar } from '@/components/ui/Navbar'
import { RealtimeRefresh } from '@/components/ui/RealtimeRefresh'
import { SwipeNav } from '@/components/ui/SwipeNav'

const LINKS = [
  { href: '/client',         label: 'Dashboard' },
  { href: '/client/tickets', label: 'Tickets'   },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar role="client" />
      <RealtimeRefresh tables={['tickets', 'quotes', 'notifications']} />
      <SwipeNav links={LINKS}>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          {children}
        </main>
      </SwipeNav>
    </div>
  )
}
