/**
 * Technical overview:
 * - Layer: middleware
 * - Responsibility: validate Bearer token with Supabase and inject req.user
 * - Failure mode: 401 on missing/invalid token
 */

import { supabaseAdmin } from '../utils/supabaseClient.js'

export async function requireAuth(req, res, next) {
  const authorizationHeader = req.headers.authorization || ''

  if (!authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token.' })
  }

  const accessToken = authorizationHeader.replace('Bearer ', '').trim()

  if (!accessToken) {
    return res.status(401).json({ message: 'Invalid bearer token.' })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken)

  if (error || !data.user) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }

  req.user = data.user
  return next()
}
