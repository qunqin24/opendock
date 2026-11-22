import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { overviewQueryOptions, publicPluginUrl } from '@/lib/admin-api'
import { formatCompact, formatNumber, timeAgo } from '@/lib/format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { QueryError } from '@/components/query-state'

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value?: number
  hint?: string
}) {
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No data yet.</p>
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
  const { data, error, isError, refetch } = useQuery(overviewQueryOptions)

  return (
    <>
      <PageHeader />
      <Main className='space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Overview</h1>
          <p className='text-sm text-muted-foreground'>
            {data
              ? `Data refreshed ${timeAgo(data.dataRefreshedAt)}`
              : isError
                ? ''
                : 'Loading…'}
          </p>
        </div>

        {isError && <QueryError error={error} onRetry={() => refetch()} />}

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
          <StatCard title='Plugins' value={data?.totals.plugins} />
          <StatCard
            title='Downloads / month'
            value={data?.totals.downloadsMonth}
          />
          <StatCard title='Stars' value={data?.totals.stars} />
          <StatCard title='Maintainers' value={data?.totals.maintainers} />
          <StatCard
            title='Overrides'
            value={data?.overrides.total}
            hint={
              data
                ? `${data.overrides.featured} featured, ${data.overrides.blocked} blocked, ${data.overrides.recategorized} recategorized`
                : undefined
            }
          />
          <StatCard
            title='Installs (30d)'
            value={data?.installs.last30d}
            hint={data ? `${formatNumber(data.installs.last7d)} in the last 7 days` : undefined}
          />
        </div>

        {data && (
          <>
            <div className='grid gap-4 md:grid-cols-2'>
              <Breakdown
                title='Health'
                description='Maintenance signals across all plugins'
                rows={[
                  { label: 'Healthy', value: data.health.ok, color: 'bg-emerald-500' },
                  { label: 'Warning', value: data.health.warn, color: 'bg-amber-500' },
                  { label: 'At risk', value: data.health.danger, color: 'bg-red-500' },
                ]}
              />
              <Breakdown
                title='OpenCode compatibility'
                description='Which OpenCode generation plugins target'
                rows={[
                  { label: 'v1', value: data.compat.v1, color: 'bg-sky-500' },
                  { label: 'v2', value: data.compat.v2, color: 'bg-violet-500' },
                  { label: 'Both', value: data.compat.both, color: 'bg-emerald-500' },
                  { label: 'Unknown', value: data.compat.unknown, color: 'bg-zinc-400' },
                ]}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Plugins by category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='h-80 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={data.categories}>
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
                        name='Plugins'
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
                title='Top downloads'
                description='Monthly npm downloads'
                items={data.topDownloads.map((p) => ({
                  ...p,
                  value: formatCompact(p.downloadsMonth),
                }))}
              />
              <PluginList
                title='Trending'
                description='Star growth over the last 7 days'
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
