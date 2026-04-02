'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface EmailContextType {
  selectedEmail: any | null
  setSelectedEmail: (email: any | null) => void
  emailContext: string
  setEmailContext: (context: string) => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export function EmailContextProvider({ children }: { children: ReactNode }) {
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null)
  const [emailContext, setEmailContext] = useState<string>('')

  return (
    <EmailContext.Provider value={{
      selectedEmail,
      setSelectedEmail,
      emailContext,
      setEmailContext
    }}>
      {children}
    </EmailContext.Provider>
  )
}

export function useEmailContext() {
  const context = useContext(EmailContext)
  if (context === undefined) {
    throw new Error('useEmailContext must be used within an EmailContextProvider')
  }
  return context
}