import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessibilityProvider } from '../hooks/useAccessibility';
import '../styles/globals.css';
import React from 'react';

// Create TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <Component {...pageProps} />
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
