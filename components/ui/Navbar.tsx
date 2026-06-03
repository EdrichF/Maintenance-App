'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { Notification } from '@/lib/types'

interface NavbarProps {
  role: 'client' | 'admin'
}

export function Navbar({ role }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetchUnread()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUnread() {
    const res = await fetch('/api/notifications')
    const data = await res.json()
    const count = (data.notifications as Notification[]).filter(n => !n.read).length
    setUnread(count)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const base = role === 'admin' ? '/admin' : '/client'
  const navLinks = role === 'admin'
    ? [{ href: '/admin', label: 'Dashboard' }, { href: '/admin/tickets', label: 'Tickets' }]
    : [{ href: '/client', label: 'Dashboard' }, { href: '/client/tickets', label: 'My Tickets' }]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href={base} className="flex items-center gap-2 font-bold text-brand-600 text-lg">
          <Wrench size={20} />
          ConnexServ
        </Link>

        {/* Links */}
        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link href={`${base}/notifications`} className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
