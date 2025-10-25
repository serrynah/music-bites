import { createClient } from "@supabase/supabase-js"

let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      // Return null if environment variables are not set
      return null
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey)
  }

  return supabaseInstance
}
