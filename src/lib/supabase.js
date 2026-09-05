import { createClient } from '@supabase/supabase-js'
import { getRoom } from './room'

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabase = Boolean(url && anonKey)

// x-room header lets RLS write policies verify the room server-side
export const supabase = hasSupabase
  ? createClient(url, anonKey, {
      global: { headers: { 'x-room': getRoom() ?? '' } },
    })
  : null
