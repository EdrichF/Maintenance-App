import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Priority, TicketStatus, QuoteStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low:    'bg-green-100  text-green-700  dark:bg-green-950  dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  urgent: 'bg-red-100    text-red-700    dark:bg-red-950    dark:text-red-400',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open:        'Open Tickets',
  quoted:      'Quote Sent',
  accepted:    'Quote Accepted',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  declined:    'Declined',
  pending_sign_off: 'Pending Sign-off',
  snag:             'Snag',
  snag_in_progress: 'Snag Underway',
  variation_pending: 'Variation Pending',
}

// One distinct hue per status, kept consistent across badges, bars and
// legends app-wide so no two statuses can be visually confused.
export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:        'bg-blue-100    text-blue-700    dark:bg-blue-950    dark:text-blue-400',
  quoted:      'bg-cyan-100    text-cyan-700    dark:bg-cyan-950    dark:text-cyan-400',
  accepted:    'bg-teal-100    text-teal-700    dark:bg-teal-950    dark:text-teal-400',
  in_progress: 'bg-amber-100   text-amber-700   dark:bg-amber-950   dark:text-amber-400',
  variation_pending: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  pending_sign_off:  'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  snag:             'bg-red-100    text-red-700    dark:bg-red-950    dark:text-red-400',
  snag_in_progress: 'bg-pink-100   text-pink-700   dark:bg-pink-950   dark:text-pink-400',
  completed:   'bg-green-100   text-green-700   dark:bg-green-950   dark:text-green-400',
  declined:    'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-400',
  cancelled:   'bg-gray-100    text-gray-600    dark:bg-gray-800    dark:text-gray-400',
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending:  'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount)
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateTimeShort(dateString: string) {
  return new Date(dateString).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}
