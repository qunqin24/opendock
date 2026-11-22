/** Picks the reader's language from data that carries both (descriptions, categories). */
import type { Locale } from '@/i18n/routing';
import type { Category, Plugin } from './data';

export const pluginDescription = (p: Pick<Plugin, 'description' | 'descriptionZh'>, locale: Locale) =>
  (locale === 'zh' ? p.descriptionZh : null) ?? p.description;

export const categoryLabel = (c: Pick<Category, 'label' | 'labelEn'>, locale: Locale) => (locale === 'zh' ? c.label : c.labelEn);

export const categoryDescription = (c: Pick<Category, 'description' | 'descriptionEn'>, locale: Locale) =>
  locale === 'zh' ? c.description : c.descriptionEn;
