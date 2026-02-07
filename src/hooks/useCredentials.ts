import { useState, useCallback } from 'react'
import type { Credentials } from '../types'
import { resetSupabaseClient } from '../lib/supabase'

const STORAGE_KEY_URL = 'sb_url'
const STORAGE_KEY_KEY = 'sb_key'
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60 // 400 days in seconds

function setCookie(key: string, value: string) {
  document.cookie = `${key}=${encodeURIComponent(value)};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax`
}

function getCookie(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]!) : null
}

function clearCookie(key: string) {
  document.cookie = `${key}=;max-age=0;path=/`
}

function loadCredentials(): Credentials | null {
  const url = localStorage.getItem(STORAGE_KEY_URL) ?? getCookie(STORAGE_KEY_URL)
  const key = localStorage.getItem(STORAGE_KEY_KEY) ?? getCookie(STORAGE_KEY_KEY)
  if (url && key) return { url, key }
  return null
}

export function useCredentials() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)

  const saveCredentials = useCallback((creds: Credentials) => {
    localStorage.setItem(STORAGE_KEY_URL, creds.url)
    localStorage.setItem(STORAGE_KEY_KEY, creds.key)
    setCookie(STORAGE_KEY_URL, creds.url)
    setCookie(STORAGE_KEY_KEY, creds.key)
    setCredentials(creds)
  }, [])

  const clearCredentials = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_URL)
    localStorage.removeItem(STORAGE_KEY_KEY)
    clearCookie(STORAGE_KEY_URL)
    clearCookie(STORAGE_KEY_KEY)
    resetSupabaseClient()
    setCredentials(null)
  }, [])

  return { credentials, saveCredentials, clearCredentials }
}
