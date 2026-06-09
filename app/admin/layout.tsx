import { Navbar } from '@/components/ui/Navbar'
import { RealtimeRefresh } from '@/components/ui/RealtimeRefresh'
import { SwipeNav } from '@/components/ui/SwipeNav'

const LINKS = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/tickets',  label: 'Tickets'   },
  { href: '/admin/regional', label: 'Clients'   },
  { href: '/admin/stats',    label: 'Stats'     },
  { href: '/admin/snag',     label: 'Snag'      },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar role="admin" />
      <RealtimeRefresh tables={['tickets', 'quotes', 'notifications', 'profiles', 'completions']} />
      <SwipeNav links={LINKS}>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          {children}
        </main>
      </SwipeNav>
    </div>
  )
}
