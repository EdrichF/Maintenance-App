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
  low:    'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  high:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open:        'Open',
  quoted:      'Quote Sent',
  accepted:    'Accepted',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:        'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  quoted:      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  accepted:    'bg-teal-100   text-teal-800   dark:bg-teal-900/40   dark:text-teal-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  completed:   'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  cancelled:   'bg-gray-100   text-gray-700   dark:bg-gray-700/60   dark:text-gray-300',
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
