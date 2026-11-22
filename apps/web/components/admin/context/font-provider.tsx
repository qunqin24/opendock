'use client'

import type * as React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { fonts } from '@/lib/admin/config/fonts'
import { getCookie, setCookie, removeCookie } from '@/lib/admin/cookies'

type Font = (typeof fonts)[number]

export const FONT_COOKIE_NAME = 'od-admin-font'
const FONT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type FontContextType = {
  font: Font
  setFont: (font: Font) => void
  resetFont: () => void
}

const FontContext = createContext<FontContextType | null>(null)

/**
 * Applies `font-<name>` to <html>. The first paint is handled by the inline
 * script in app/admin/layout.tsx; this provider takes over after hydration.
 */
export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, _setFont] = useState<Font>(fonts[0])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = getCookie(FONT_COOKIE_NAME)
    if (fonts.includes(saved as Font)) _setFont(saved as Font)
    setLoaded(true)
  }, [])

  useEffect(() => {
    // Until the stored choice is known, leave what the inline script set.
    if (!loaded) return
    const root = document.documentElement
    root.classList.forEach((cls) => {
      if (cls.startsWith('font-')) root.classList.remove(cls)
    })
    root.classList.add(`font-${font}`)
  }, [font, loaded])

  const setFont = (next: Font) => {
    setCookie(FONT_COOKIE_NAME, next, FONT_COOKIE_MAX_AGE)
    _setFont(next)
  }

  const resetFont = () => {
    removeCookie(FONT_COOKIE_NAME)
    _setFont(fonts[0])
  }

  return (
    <FontContext value={{ font, setFont, resetFont }}>{children}</FontContext>
  )
}

export const useFont = () => {
  const context = useContext(FontContext)
  if (!context) throw new Error('useFont must be used within a FontProvider')
  return context
}
