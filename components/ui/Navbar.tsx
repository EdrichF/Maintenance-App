'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { MotivLogo } from '@/components/ui/MotivLogo'
import { useEffect, useState } from 'react'
import type { Notification } from '@/lib/types'

type NavRole = 'client' | 'admin' | 'regional'

interface NavbarProps {
  role: NavRole
}

const NAV_LINKS: Record<NavRole, { href: string; label: string }[]> = {
  admin:    [
    { href: '/admin',          label: 'Dashboard' },
    { href: '/admin/tickets',  label: 'Tickets'   },
    { href: '/admin/regional', label: 'Clients'   },
    { href: '/admin/stats',    label: 'Stats'     },
    { href: '/admin/snag',     label: 'Snag'      },
  ],
  regional: [
    { href: '/regional',         label: 'Dashboard' },
    { href: '/regional/tickets', label: 'Tickets'   },
    { href: '/regional/stores',  label: 'Stores'    },
    { href: '/regional/signoff', label: 'Sign-off'  },
    { href: '/regional/snag',    label: 'Snag'      },
  ],
  client: [
    { href: '/client',         label: 'Dashboard' },
    { href: '/client/tickets', label: 'Tickets'   },
  ],
}

const BASE: Record<NavRole, string> = {
  admin:    '/admin',
  regional: '/regional',
  client:   '/client',
}

export function Navbar({ role }: NavbarProps) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUnread() {
    const res = await fetch('/api/notifications')
    if (!res.ok) return
    const data = await res.json()
    const count = (data.notifications as Notification[]).filter(n => !n.read).length
    setUnread(count)
  }

  const links = NAV_LINKS[role]
  const base  = BASE[role]

  const iconBtn =
    'p-2 rounded-lg transition-colors ' +
    'text-gray-500 dark:text-gray-400 ' +
    'hover:text-gray-900 dark:hover:text-white ' +
    'hover:bg-gray-100 dark:hover:bg-gray-800'

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">

        {/* Logo */}
        <Link href={base} className="shrink-0">
          <MotivLogo size={36} />
        </Link>

        {/* Nav links — evenly spaced, no scroll */}
        <div className="flex items-center justify-center flex-1 mx-2 gap-0.5">
          {links.map(link => {
            const active =
              pathname === link.href ||
              (link.href !== base && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  'px-2 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ' +
                  (active
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800')
                }
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right actions — bell + settings only */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Link href={`${base}/notifications`} className={`relative ${iconBtn}`}>
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <Link href="/settings" className={iconBtn} title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
        </div>
      </div>
    </nav>
  )
}
