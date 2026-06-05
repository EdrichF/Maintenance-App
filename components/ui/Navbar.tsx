'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, Wrench, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { Notification } from '@/lib/types'

type NavRole = 'client' | 'admin' | 'regional'

interface NavbarProps {
  role: NavRole
}

const NAV_LINKS: Record<NavRole, { href: string; label: string }[]> = {
  admin:    [
    { href: '/admin',          label: 'Dashboard' },
    { href: '/admin/tickets',  label: 'Tickets'   },
    { href: '/admin/stores',   label: 'Stores'    },
    { href: '/admin/regional', label: 'Regional'  },
  ],
  regional: [
    { href: '/regional',         label: 'Dashboard' },
    { href: '/regional/tickets', label: 'Tickets'   },
    { href: '/regional/stores',  label: 'Stores'    },
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
  const router   = useRouter()
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
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
        <Link href={base} className="flex items-center gap-2 font-bold text-brand-600 text-lg shrink-0">
          <Wrench size={20} />
          <span className="hidden sm:inline">ConnexServ</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {links.map(link => {
            const active =
              pathname === link.href ||
              (link.href !== base && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ' +
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

        {/* Right actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ThemeToggle />

          <Link href="/settings" className={iconBtn} title="Settings">
            <Settings size={18} />
          </Link>

          <Link href={`${base}/notifications`} className={`relative ${iconBtn}`}>
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <button onClick={handleLogout} className={iconBtn} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
