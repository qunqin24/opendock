'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { fonts } from '@/lib/admin/config/fonts'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/admin/utils'
import { useFont } from '@/components/admin/context/font-provider'
import { useTheme } from '@/components/admin/context/theme-provider'
import { LOCALE_NAMES } from '@/components/admin/language-switch'
import { routing, type Locale } from '@/i18n/routing'
import { useSwitchAdminLocale } from '@/lib/admin/locale'
import { Button, buttonVariants } from '@/components/admin/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/admin/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/admin/ui/radio-group'

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark']),
  font: z.enum(fonts),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

export function AppearanceForm() {
  const t = useTranslations('admin.settings.appearance')
  const language = useTranslations('admin.language')
  const common = useTranslations('admin.common.theme')
  const { locale, switchLocale } = useSwitchAdminLocale()
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()

  // This can come from your database or API.
  const defaultValues: Partial<AppearanceFormValues> = {
    theme: theme as 'light' | 'dark',
    font,
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  })

  function onSubmit(data: AppearanceFormValues) {
    if (data.font != font) setFont(data.font)
    if (data.theme != theme) setTheme(data.theme)

    toast.success(t('updated'))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* Applies immediately (cookie + refresh); not part of the submit below. */}
        <div className='space-y-2'>
          <label htmlFor='admin-language' className='text-sm leading-none font-medium'>
            {language('label')}
          </label>
          <div className='relative w-max'>
            <select
              id='admin-language'
              value={locale}
              onChange={(e) => switchLocale(e.target.value as Locale)}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-50 appearance-none font-normal',
                'dark:bg-background dark:hover:bg-background'
              )}
            >
              {routing.locales.map((l) => (
                <option key={l} value={l} lang={l === 'zh' ? 'zh-CN' : 'en'}>
                  {LOCALE_NAMES[l]}
                </option>
              ))}
            </select>
            <ChevronDownIcon className='absolute inset-e-3 top-2.5 h-4 w-4 opacity-50' />
          </div>
          <p className='text-[0.8rem] text-muted-foreground'>{language('description')}</p>
        </div>
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('font')}</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-50 appearance-none font-normal',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {t(`fonts.${font}`)}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute inset-e-3 top-2.5 h-4 w-4 opacity-50' />
              </div>
              <FormDescription className='font-manrope'>
                {t('fontDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='theme'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('theme')}</FormLabel>
              <FormDescription>
                {t('themeDescription')}
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className='grid max-w-md grid-cols-2 gap-8 pt-2'
              >
                <FormItem>
                  <FormLabel className='flex-col items-stretch gap-0 [&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='light' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted p-1 hover:border-accent'>
                      <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
                        <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-2 w-20 rounded-lg bg-[#ecedef]' />
                          <div className='h-2 w-25 rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-25 rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-25 rounded-lg bg-[#ecedef]' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {common('light')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='flex-col items-stretch gap-0 [&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='dark' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground'>
                      <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
                        <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-2 w-20 rounded-lg bg-slate-400' />
                          <div className='h-2 w-25 rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-25 rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-25 rounded-lg bg-slate-400' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {common('dark')}
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Button type='submit'>{t('submit')}</Button>
      </form>
    </Form>
  )
}
