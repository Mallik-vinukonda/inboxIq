'use client'

import { ClerkProvider } from '@clerk/nextjs'
// import { dark } from '@clerk/themes' // Commented out as it's causing import issues
import { useTheme } from 'next-themes'

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <ClerkProvider
      appearance={{
        // baseTheme: theme === 'dark' ? dark : undefined, // Commented out due to import issues
      }}
    >
      {children}
    </ClerkProvider>
  )
}