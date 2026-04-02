'use client'

import { useEffect, useRef, useCallback } from 'react'
import { api } from '~/trpc/react'
import { toast } from 'sonner'

const SYNC_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes

/**
 * Custom hook that polls for new emails every 3 minutes for each connected account.
 * Pauses when the browser tab is hidden to save resources.
 */
export function useEmailSync() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  const utils = api.useUtils()
  const { data: accounts } = api.account.getAccounts.useQuery(undefined, {
    retry: 2,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const syncMutation = api.account.syncEmails.useMutation({
    onSuccess: (data) => {
      if (data.syncedCount > 0) {
        toast.success(`📬 ${data.syncedCount} new email${data.syncedCount > 1 ? 's' : ''} synced`)
        // Invalidate email queries to refresh the UI
        utils.account.getEmails.invalidate()
        utils.account.getUnreadCounts.invalidate()
      }
    },
    onError: (error) => {
      console.error('Auto-sync error:', error.message)
      // Don't show toast for auto-sync errors to avoid spamming the user
    },
  })

  const syncAllAccounts = useCallback(() => {
    if (!accounts || accounts.length === 0) return
    if (!isVisibleRef.current) return // Skip sync when tab is hidden
    if (syncMutation.isPending) return // Skip if already syncing

    for (const account of accounts) {
      if (account.isActive) {
        console.log('🔄 Auto-syncing:', account.email)
        syncMutation.mutate({ accountId: account.id })
        // Only sync one account at a time to avoid rate limits
        break
      }
    }
  }, [accounts, syncMutation])

  useEffect(() => {
    // Start polling interval
    intervalRef.current = setInterval(syncAllAccounts, SYNC_INTERVAL_MS)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [syncAllAccounts])

  // Pause/resume based on page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden

      if (!document.hidden) {
        // Tab became visible — do an immediate sync
        console.log('👁️ Tab visible, triggering sync...')
        syncAllAccounts()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [syncAllAccounts])

  return {
    isSyncing: syncMutation.isPending,
    syncNow: syncAllAccounts,
  }
}
