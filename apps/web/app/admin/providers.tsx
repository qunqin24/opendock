'use client'

import type * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FontProvider } from '@/components/admin/context/font-provider';
import { ThemeProvider } from '@/components/admin/context/theme-provider';
import { Toaster } from '@/components/admin/ui/sonner';
import { ApiError, setUnauthorizedHandler } from '@/lib/admin/api'
import { type ErrorTranslator, describeError } from '@/lib/admin/api-errors';

function makeQueryClient(getT: () => ErrorTranslator) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Never retry auth/permission/client errors.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        staleTime: 10 * 1000,
      },
      mutations: {
        onError: (error) => {
          // 401 is handled globally by the unauthorized handler below.
          if (error instanceof ApiError && error.status === 401) return;
          toast.error(describeError(getT(), error));
        },
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.errors')
  // The query client lives for the whole session; keep the latest translator
  // in a ref so toasts follow a language switch.
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])
  const [queryClient] = useState(() => makeQueryClient(() => tRef.current))

  // Any 401 from the API sends the user to the sign-in page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const { pathname, search } = window.location;
      if (pathname.startsWith('/admin/sign-in')) return;
      queryClient.clear();
      toast.error(tRef.current('sessionExpired'));
      window.location.replace(
        `/admin/sign-in?redirect=${encodeURIComponent(pathname + search)}`,
      );
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          {children}
          <Toaster duration={5000} />
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
