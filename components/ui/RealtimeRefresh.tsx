'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  tables?: string[]
}

// Subscribes to Supabase Realtime on the given tables and calls router.refresh()
// whenever any INSERT / UPDATE / DELETE happens. Add to any layout.
export function RealtimeRefresh({ tables = ['tickets', 'quotes', 'notifications'] }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channels = tables.map(table =>
      supabase
        .channel(`realtime-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          router.refresh()
        })
        .subscribe()
    )

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [router])

  return null
}
