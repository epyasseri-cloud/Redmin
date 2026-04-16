/**
 * Technical overview:
 * - Layer: service
 * - Responsibility: initialize frontend Supabase client singleton
 * - Config: uses VITE_SUPABASE env variables
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key-placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
