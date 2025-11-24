'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// Helper to get the correct origin (localhost vs production)
function getOrigin() {
  // Check if running on Vercel
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  // Check if custom production URL is set
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // Default to localhost for development
  return 'http://localhost:3000';
}

export async function signInWithEmail(email: string) {
  // Initialize Supabase client with SERVER-ONLY keys
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const origin = getOrigin();
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Redirect to homepage after clicking magic link
      emailRedirectTo: `${origin}/`,
    },
  })

  if (error) {
    console.error('Server Auth Error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function signInWithGoogle() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const origin = getOrigin();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirect to homepage after Google auth
      redirectTo: `${origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('Server Google Error:', error)
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}
