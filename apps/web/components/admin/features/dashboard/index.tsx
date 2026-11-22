'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { overviewQueryOptions, publicPluginUrl } from '@/lib/admin/admin-api'
import { categoryName } from '@/lib/admin/category'
import { useFormat } from '@/lib/admin/format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/card'
import { Skeleton } from '@/components/admin/ui/skeleton'
import { Main } from '@/components/admin/layout/main'
import { PageHeader } from '@/components/admin/page-header'
import { QueryError } from '@/components/admin/query-state'

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value?: number
  hint?: string
}) {
  const { formatNumber } = useFormat()
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardDescription>{title}</CardDescription>
        <CardTitle className='text-2xl tabular-nums'>
          {value === undefined ? (
            <Skeleton className='h-8 w-20' />
          ) : (
            formatNumber(value)
          )}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className='text-xs text-muted-foreground'>{hint}</CardContent>
      )}
    </Card>
  )
}

function Breakdown({
  title,
  description,
  rows,
}: {
  title: string
  description?: string
  rows: { label: string; value: number; color: string }[]
}) {
  const { formatNumber } = useFormat()
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='flex h-2 overflow-hidden rounded-full bg-muted'>
          {rows.map((r) => (
            <div
              key={r.label}
              className={r.color}
              style={{ width: `${total ? (r.value / total) * 100 : 0}%` }}
            />
          ))}
        </div>
        <ul className='space-y-1.5 text-sm'>
          {rows.map((r) => (
            <li key={r.label} className='flex items-center gap-2'>
              <span className={`size-2.5 rounded-full ${r.color}`} />
              <span className='flex-1'>{r.label}</span>
              <span className='tabular-nums'>{formatNumber(r.value)}</span>
              <span className='w-12 text-end text-xs text-muted-foreground tabular-nums'>
                {total ? `${((r.value / total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function PluginList({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: { slug: string; title: string; name: string; value: string }[]
}) {
  const t = useTranslations('admin.dashboard')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('noData')}</p>
        ) : (
          <ol className='space-y-2'>
            {items.map((item, i) => (
              <li key={item.name} className='flex items-center gap-3 text-sm'>
                <span className='w-5 text-xs text-muted-foreground tabular-nums'>
                  {i + 1}
                </span>
                <a
                  href={publicPluginUrl(item.slug)}
                  target='_blank'
                  rel='noreferrer'
                  className='min-w-0 flex-1 truncate font-medium hover:underline'
                  title={item.name}
                >
                  {item.title}
                </a>
                <span className='tabular-nums'>{item.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const t = useTranslations('admin.dashboard')
  const common = useTranslations('admin.common')
  const stats = useTranslations('admin.dashboard.stats')
  const health = useTranslations('admin.health')
  const compat = useTranslations('admin.compat')
  const { locale, formatCompact, formatNumber, timeAgo } = useFormat()
  const { data, error, isError, refetch } = useQuery(overviewQueryOptions)

  return (
    <>
      <PageHeader />
      <Main className='space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground'>
            {data
              ? t('refreshed', { when: timeAgo(data.dataRefreshedAt) })
              : isError
                ? ''
                : common('loading')}
          </p>
        </div>

        {isError && <QueryError error={error} onRetry={() => refetch()} />}

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
          <StatCard title={stats('plugins')} value={data?.totals.plugins} />
          <StatCard
            title={stats('downloads')}
            value={data?.totals.downloadsMonth}
          />
          <StatCard title={stats('stars')} value={data?.totals.stars} />
          <StatCard title={stats('maintainers')} value={data?.totals.maintainers} />
          <StatCard
            title={stats('overrides')}
            value={data?.overrides.total}
            hint={
              data
                ? t('overridesHint', {
                    featured: formatNumber(data.overrides.featured),
                    blocked: formatNumber(data.overrides.blocked),
                    recategorized: formatNumber(data.overrides.recategorized),
                  })
                : undefined
            }
          />
          <StatCard
            title={stats('installs30d')}
            value={data?.installs.last30d}
            hint={
              data
                ? t('installsHint', { count: formatNumber(data.installs.last7d) })
                : undefined
            }
          />
        </div>

        {data && (
          <>
            <div className='grid gap-4 md:grid-cols-2'>
              <Breakdown
                title={t('health.title')}
                description={t('health.description')}
                rows={[
                  { label: health('ok'), value: data.health.ok, color: 'bg-emerald-500' },
                  { label: health('warn'), value: data.health.warn, color: 'bg-amber-500' },
                  { label: health('danger'), value: data.health.danger, color: 'bg-red-500' },
                ]}
              />
              <Breakdown
                title={t('compat.title')}
                description={t('compat.description')}
                rows={[
                  { label: compat('v1'), value: data.compat.v1, color: 'bg-sky-500' },
                  { label: compat('v2'), value: data.compat.v2, color: 'bg-violet-500' },
                  { label: compat('both'), value: data.compat.both, color: 'bg-emerald-500' },
                  { label: compat('unknown'), value: data.compat.unknown, color: 'bg-zinc-400' },
                ]}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('byCategory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='h-80 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={data.categories.map((c) => ({
                        ...c,
                        label: categoryName(c, locale),
                      }))}
                    >
                      <CartesianGrid vertical={false} strokeDasharray='3 3' stroke='var(--border)' />
                      <XAxis
                        dataKey='label'
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-30}
                        textAnchor='end'
                        height={70}
                        fontSize={11}
                        stroke='var(--muted-foreground)'
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        stroke='var(--muted-foreground)'
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                        contentStyle={{
                          background: 'var(--popover)',
                          color: 'var(--popover-foreground)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                        }}
                      />
                      <Bar
                        dataKey='count'
                        name={stats('plugins')}
                        fill='var(--primary)'
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className='grid gap-4 md:grid-cols-2'>
              <PluginList
                title={t('topDownloads.title')}
                description={t('topDownloads.description')}
                items={data.topDownloads.map((p) => ({
                  ...p,
                  value: formatCompact(p.downloadsMonth),
                }))}
              />
              <PluginList
                title={t('trending.title')}
                description={t('trending.description')}
                items={data.trending.map((p) => ({
                  ...p,
                  value: `+${formatNumber(p.starsDelta7d)}`,
                }))}
              />
            </div>
          </>
        )}
      </Main>
    </>
  )
}
