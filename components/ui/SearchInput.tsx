'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  placeholder?: string
  paramName?: string
}

export function SearchInput({ placeholder = 'Search…', paramName = 'q' }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const value        = searchParams.get(paramName) ?? ''

  const update = useCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val) params.set(paramName, val)
    else     params.delete(paramName)
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams, paramName])

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        value={value}
        onChange={e => update(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {value && (
        <button onClick={() => update('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
