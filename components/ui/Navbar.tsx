'use client'

import Link from 'next/link'
import { Bell, Settings } from 'lucide-react'
import { MotivLogo } from '@/components/ui/MotivLogo'
import { useEffect, useState } from 'react'
import type { Notification } from '@/lib/types'

type NavRole = 'client' | 'admin' | 'regional'

const BASE: Record<NavRole, string> = {
  admin:    '/admin',
  regional: '/regional',
  client:   '/client',
}

export function Navbar({ role }: { role: NavRole }) {
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

  const base = BASE[role]

  const iconBtn =
    'p-2 rounded-lg transition-colors ' +
    'text-gray-500 dark:text-gray-400 ' +
    'hover:text-gray-900 dark:hover:text-white ' +
    'hover:bg-gray-100 dark:hover:bg-gray-800'

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href={base} className="shrink-0">
          <MotivLogo size={36} />
        </Link>

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
            <Settings size={18} />
          </Link>
        </div>
      </div>
    </nav>
  )
}
