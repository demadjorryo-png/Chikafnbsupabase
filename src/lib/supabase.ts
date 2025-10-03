
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://opffkrpsazjzonwxmwii.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local")
}
export const supabase = createClient(supabaseUrl, supabaseKey)
