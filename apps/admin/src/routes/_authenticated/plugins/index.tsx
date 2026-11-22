import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Plugins } from '@/features/plugins'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  health: z.enum(['ok', 'warn', 'danger']).optional().catch(undefined),
  overridden: z.boolean().optional().catch(undefined),
  sort: z
    .enum(['score', 'downloads', 'stars', 'updated'])
    .optional()
    .catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
  pageSize: z.number().int().min(1).max(100).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/plugins/')({
  validateSearch: searchSchema,
  component: Plugins,
})
