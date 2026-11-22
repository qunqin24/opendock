import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiError, errorMessage, setUnauthorizedHandler } from '@/lib/api'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry auth/permission/client errors.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500)
          return false
        return failureCount < 2
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        // 401 is handled globally by the unauthorized handler below.
        if (error instanceof ApiError && error.status === 401) return
        toast.error(errorMessage(error))
      },
    },
  },
})

// Create a new router instance
const router = createRouter({
  routeTree,
  basepath: '/admin',
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Any 401 from the API sends the user to the sign-in page.
setUnauthorizedHandler(() => {
  queryClient.removeQueries({ queryKey: ['auth'] })
  const location = router.state.location
  if (location.pathname.startsWith('/sign-in')) return
  toast.error('Session expired. Please sign in again.')
  router.navigate({
    to: '/sign-in',
    search: { redirect: location.href },
    replace: true,
  })
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
