import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Notification } from '@/lib/types'
import { MarkAllReadButton } from '@/components/ui/MarkAllReadButton'

export default async function ClientNotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <MarkAllReadButton />
      </div>

      {!notifications?.length ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center">
          <Bell className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(notifications as Notification[]).map(n => (
            <div key={n.id} className={`border rounded-xl px-4 py-3 ${!n.read ? 'border-brand-200 bg-brand-50/30 dark:border-brand-700 dark:bg-brand-900/10' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              {n.link ? (
                <Link href={n.link} className="block">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{n.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(n.created_at)}</p>
                </Link>
              ) : (
                <>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{n.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(n.created_at)}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
