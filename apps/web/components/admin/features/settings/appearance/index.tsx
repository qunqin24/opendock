'use client'

import { useTranslations } from 'next-intl'
import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  const t = useTranslations('admin.settings.appearance')
  return (
    <ContentSection
      title={t('title')}
      desc={t('description')}
    >
      <AppearanceForm />
    </ContentSection>
  )
}
