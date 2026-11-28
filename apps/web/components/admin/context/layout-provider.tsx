'use client'

import type * as React from 'react'
import { createContext, useContext, useState } from 'react'
import { setCookie } from '@/lib/admin/cookies'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
export type Variant = 'inset' | 'sidebar' | 'floating'

export type LayoutInitial = { collapsible?: string; variant?: string }

// Cookie constants following the pattern from sidebar.tsx
export const LAYOUT_COLLAPSIBLE_COOKIE_NAME = 'layout_collapsible'
export const LAYOUT_VARIANT_COOKIE_NAME = 'layout_variant'
const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Default values
const DEFAULT_VARIANT: Variant = 'inset'
const DEFAULT_COLLAPSIBLE: Collapsible = 'icon'

const VARIANTS: Variant[] = ['inset', 'sidebar', 'floating']
const COLLAPSIBLES: Collapsible[] = ['offcanvas', 'icon', 'none']

type LayoutContextType = {
  resetLayout: () => void

  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void

  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

type LayoutProviderProps = {
  children: React.ReactNode
  /** Cookie values read on the server, so SSR and hydration agree. */
  initial?: LayoutInitial
}

export function LayoutProvider({ children, initial }: LayoutProviderProps) {
  const [collapsible, _setCollapsible] = useState<Collapsible>(
    COLLAPSIBLES.includes(initial?.collapsible as Collapsible)
      ? (initial!.collapsible as Collapsible)
      : DEFAULT_COLLAPSIBLE
  )

  const [variant, _setVariant] = useState<Variant>(
    VARIANTS.includes(initial?.variant as Variant)
      ? (initial!.variant as Variant)
      : DEFAULT_VARIANT
  )

  const setCollapsible = (newCollapsible: Collapsible) => {
    _setCollapsible(newCollapsible)
    setCookie(
      LAYOUT_COLLAPSIBLE_COOKIE_NAME,
      newCollapsible,
      LAYOUT_COOKIE_MAX_AGE
    )
  }

  const setVariant = (newVariant: Variant) => {
    _setVariant(newVariant)
    setCookie(LAYOUT_VARIANT_COOKIE_NAME, newVariant, LAYOUT_COOKIE_MAX_AGE)
  }

  const resetLayout = () => {
    setCollapsible(DEFAULT_COLLAPSIBLE)
    setVariant(DEFAULT_VARIANT)
  }

  const contextValue: LayoutContextType = {
    resetLayout,
    defaultCollapsible: DEFAULT_COLLAPSIBLE,
    collapsible,
    setCollapsible,
    defaultVariant: DEFAULT_VARIANT,
    variant,
    setVariant,
  }

  return <LayoutContext value={contextValue}>{children}</LayoutContext>
}

// Define the hook for the provider
export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
