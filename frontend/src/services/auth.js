import { supabase } from './supabase.js'

export async function signInWithPassword(credentials) {
  const { data, error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    throw error
  }

  return data
}

export async function signUpWithPassword(credentials) {
  const { data, error } = await supabase.auth.signUp(credentials)

  if (error) {
    throw error
  }

  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOutSession() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}