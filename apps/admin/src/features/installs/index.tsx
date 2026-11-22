import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
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
import { installsQueryOptions } from '@/lib/admin-api'
import { formatNumber } from '@/lib/format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { QueryError } from '@/components/query-state'

const route = getRouteApi('/_authenticated/installs/')

const RANGES = [7, 30, 90] as const

export function Installs() {
  const { days } = route.useSearch()
  const navigate = route.useNavigate()
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
            <h1 className='text-2xl font-bold tracking-tight'>Installs</h1>
            <p className='text-sm text-muted-foreground'>
              Anonymous, opt-in telemetry from the OpenDock OpenCode plugin.
            </p>
          </div>
          <Tabs
            value={String(days)}
            onValueChange={(v) =>
              navigate({ search: { days: Number(v) as 7 | 30 | 90 } })
            }
          >
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r} value={String(r)}>
                  {r} days
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
              No installs yet. Counts appear once the OpenDock plugin ships and
              users opt in.
            </CardContent>
          </Card>
        )}

        {data && !empty && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className='tabular-nums'>
                  {formatNumber(data.total)} events
                </CardTitle>
                <CardDescription>
                  Installs, updates and uninstalls per day, last {data.days} days
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
                        name='Install'
                        stackId='1'
                        stroke='var(--chart-2)'
                        fill='var(--chart-2)'
                        fillOpacity={0.4}
                      />
                      <Area
                        type='monotone'
                        dataKey='update'
                        name='Update'
                        stackId='1'
                        stroke='var(--chart-1)'
                        fill='var(--chart-1)'
                        fillOpacity={0.4}
                      />
                      <Area
                        type='monotone'
                        dataKey='uninstall'
                        name='Uninstall'
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
                  <CardTitle>Top plugins</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plugin</TableHead>
                        <TableHead className='text-end'>Installs</TableHead>
                        <TableHead className='text-end'>Uninstalls</TableHead>
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
                  <CardTitle>OpenCode versions</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byOpencodeVersion.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      No version data reported.
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
