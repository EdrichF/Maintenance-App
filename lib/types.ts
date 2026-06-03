export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
export type QuoteStatus = 'pending' | 'accepted' | 'declined'

export interface Profile {
  id: string
  role: 'client' | 'admin'
  full_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  company_name: string | null
  sub_store: string | null
  created_at: string
}

export interface Ticket {
  id: string
  client_id: string
  title: string
  description: string
  priority: Priority
  status: TicketStatus
  photo_urls: string[]
  created_at: string
  updated_at: string
  profiles?: Profile  // joined
}

export interface Quote {
  id: string
  ticket_id: string
  admin_id: string
  amount: number
  description: string
  valid_until: string | null
  status: QuoteStatus
  created_at: string
  tickets?: Ticket    // joined
  profiles?: Profile  // admin profile, joined
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}
