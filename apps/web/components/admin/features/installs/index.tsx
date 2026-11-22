'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSearchNavigate } from '@/lib/admin/hooks/use-search-navigate'
import { installsQueryOptions } from '@/lib/admin/admin-api'
import { useFormat } from '@/lib/admin/format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/card'
import { Skeleton } from '@/components/admin/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/admin/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin/ui/table'
import { Main } from '@/components/admin/layout/main'
import { PageHeader } from '@/components/admin/page-header'
import { QueryError } from '@/components/admin/query-state'

const RANGES = [7, 30, 90] as const

function parseDays(value: string | null): 7 | 30 | 90 {
  const n = Number(value)
  return (RANGES as readonly number[]).includes(n) ? (n as 7 | 30 | 90) : 30
}

export function Installs() {
  const t = useTranslations('admin.installs')
  const { formatNumber } = useFormat()
  const searchParams = useSearchParams()
  const days = parseDays(searchParams.get('days'))
  const current = useMemo(() => ({ days: days === 30 ? undefined : days }), [days])
  const navigate = useSearchNavigate(current)
  const { data, error, isError, isPending, refetch } = useQuery(
    installsQueryOptions(days)
  )

  const empty = data && data.total === 0

  return (
    <>
      <PageHeader />
      <Main className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
            <p className='text-sm text-muted-foreground'>
              {t('description')}
            </p>
          </div>
          <Tabs
            value={String(days)}
            onValueChange={(v) =>
              navigate({ search: { days: Number(v) === 30 ? undefined : Number(v) } })
            }
          >
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r} value={String(r)}>
                  {t('range', { days: r })}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isError && <QueryError error={error} onRetry={() => refetch()} />}
        {isPending && !isError && <Skeleton className='h-80 w-full' />}

        {empty && (
          <Card>
            <CardContent className='py-12 text-center text-sm text-muted-foreground'>
              {t('empty')}
            </CardContent>
          </Card>
        )}

        {data && !empty && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className='tabular-nums'>
                  {t('events', { count: formatNumber(data.total) })}
                </CardTitle>
                <CardDescription>
                  {t('chartDescription', { days: data.days })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='h-72 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={data.byDay}>
                      <CartesianGrid vertical={false} strokeDasharray='3 3' stroke='var(--border)' />
                      <XAxis
                        dataKey='day'
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        minTickGap={24}
                        tickFormatter={(d: string) => d.slice(5)}
                        stroke='var(--muted-foreground)'
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        stroke='var(--muted-foreground)'
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--popover)',
                          color: 'var(--popover-foreground)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Area
                        type='monotone'
                        dataKey='install'
                        name={t('series.install')}
                        stackId='1'
                        stroke='var(--chart-2)'
                        fill='var(--chart-2)'
                        fillOpacity={0.4}
                      />
                      <Area
                        type='monotone'
                        dataKey='update'
                        name={t('series.update')}
                        stackId='1'
                        stroke='var(--chart-1)'
                        fill='var(--chart-1)'
                        fillOpacity={0.4}
                      />
                      <Area
                        type='monotone'
                        dataKey='uninstall'
                        name={t('series.uninstall')}
                        stackId='1'
                        stroke='var(--chart-4)'
                        fill='var(--chart-4)'
                        fillOpacity={0.4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('topPlugins')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('plugin')}</TableHead>
                        <TableHead className='text-end'>{t('installsColumn')}</TableHead>
                        <TableHead className='text-end'>{t('uninstallsColumn')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topPlugins.map((p) => (
                        <TableRow key={p.name}>
                          <TableCell className='font-medium'>{p.name}</TableCell>
                          <TableCell className='text-end tabular-nums'>
                            {formatNumber(p.installs)}
                          </TableCell>
                          <TableCell className='text-end tabular-nums'>
                            {formatNumber(p.uninstalls)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('versions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byOpencodeVersion.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      {t('noVersions')}
                    </p>
                  ) : (
                    <ul className='space-y-2 text-sm'>
                      {data.byOpencodeVersion.map((v) => {
                        const max = Math.max(
                          ...data.byOpencodeVersion.map((x) => x.count)
                        )
                        return (
                          <li key={v.version} className='flex items-center gap-3'>
                            <span className='w-24 truncate font-mono text-xs'>
                              {v.version}
                            </span>
                            <div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
                              <div
                                className='h-full bg-primary'
                                style={{ width: `${(v.count / max) * 100}%` }}
                              />
                            </div>
                            <span className='w-10 text-end tabular-nums'>
                              {formatNumber(v.count)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </Main>
    </>
  )
}
