/**
 * Technical overview:
 * - Layer: controller
 * - Responsibility: return authenticated profile from Supabase
 * - Input/Output: req.user.id -> profile payload or error
 */

import { supabaseAdmin } from '../utils/supabaseClient.js'

export async function getAuthenticatedProfile(req, res) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, has_sms, phone_number, created_at, updated_at')
    .eq('id', req.user.id)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ message: 'Unable to load profile.' })
  }

  if (!data) {
    return res.status(404).json({
      message: 'Profile not found. Verify the Supabase trigger is installed.',
    })
  }

  return res.json(data)
}
