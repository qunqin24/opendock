import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Installs } from '@/features/installs'

const searchSchema = z.object({
  days: z
    .union([z.literal(7), z.literal(30), z.literal(90)])
    .catch(30)
    .default(30),
})

export const Route = createFileRoute('/_authenticated/installs/')({
  validateSearch: searchSchema,
  component: Installs,
})
