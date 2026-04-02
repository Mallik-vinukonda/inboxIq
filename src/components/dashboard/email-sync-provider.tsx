'use client'

import { useEmailSync } from '~/hooks/use-email-sync'

/**
 * Invisible component that mounts the auto-sync polling hook.
 * Placed in the dashboard layout so it runs across all dashboard pages.
 */
export function EmailSyncProvider() {
  useEmailSync()
  return null
}
