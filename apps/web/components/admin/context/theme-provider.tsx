'use client'

import type * as React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/admin/cookies'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

const DEFAULT_THEME: Theme = 'system'
export const THEME_COOKIE_NAME = 'od-admin-theme'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type ThemeProviderState = {
  defaultTheme: Theme
  resolvedTheme: ResolvedTheme
  theme: Theme
  setTheme: (theme: Theme) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeProviderState | null>(null)

const systemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

/**
 * Keeps the `dark` / `light` class on <html> in sync. The first paint is
 * handled by the inline script in app/admin/layout.tsx; this provider takes
 * over after hydration.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start from the default so server and client markup agree; the
  // stored choice is read right after mount.
  const [theme, _setTheme] = useState<Theme>(DEFAULT_THEME)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = getCookie(THEME_COOKIE_NAME)
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      _setTheme(saved)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    // Until the stored choice is known, leave what the inline script set.
    if (!loaded) return
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const next = theme === 'system' ? systemTheme() : theme
      root.classList.remove('light', 'dark')
      root.classList.add(next)
      setResolvedTheme(next)
    }

    apply()
    if (theme !== 'system') return
    mediaQuery.addEventListener('change', apply)
    return () => mediaQuery.removeEventListener('change', apply)
  }, [theme, loaded])

  const setTheme = (next: Theme) => {
    setCookie(THEME_COOKIE_NAME, next, THEME_COOKIE_MAX_AGE)
    _setTheme(next)
  }

  const resetTheme = () => {
    removeCookie(THEME_COOKIE_NAME)
    _setTheme(DEFAULT_THEME)
  }

  return (
    <ThemeContext
      value={{
        defaultTheme: DEFAULT_THEME,
        resolvedTheme,
        resetTheme,
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
