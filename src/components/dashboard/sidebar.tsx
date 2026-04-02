'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EmailComposer } from './email-composer'
import { AdvancedSearch } from './advanced-search'
import { GmailConnectModal } from './gmail-connect-modal'
import { CalendarIntegration } from './calendar-integration'
import { ModeToggle } from '~/components/mode-toggle'
import {
  Plus, Search, X, Mail, SendHorizontal, ArchiveIcon, StarIcon,
  Trash, Bot, LayoutGrid, Zap, Sparkles, Calendar, Filter, Clock
} from 'lucide-react'
import { api } from '~/trpc/react'
import { toast } from 'sonner'
import { cn } from '~/lib/utils'

const sidebarItems = [
  { icon: Mail, label: 'Inbox', href: '/dashboard', folder: 'inbox' },
  { icon: StarIcon, label: 'Starred', href: '/dashboard/starred', folder: 'starred' },
  { icon: SendHorizontal, label: 'Sent', href: '/dashboard/sent', folder: 'sent' },
  { icon: ArchiveIcon, label: 'Archive', href: '/dashboard/archive', folder: 'archive' },
  { icon: Trash, label: 'Trash', href: '/dashboard/trash', folder: 'trash' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isScheduleMode, setIsScheduleMode] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showSmartFilters, setShowSmartFilters] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // Handle OAuth success redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('gmail_connected') === 'true') {
      toast.success('Gmail account connected successfully!')
      window.history.replaceState({}, '', '/dashboard')
      refetchAccounts()
    }
    if (params.get('error')) {
      const errorMap: Record<string, string> = {
        oauth_denied: 'Google sign-in was cancelled.',
        oauth_init_failed: 'Failed to start Google sign-in.',
        oauth_callback_failed: 'Failed to connect Gmail. Please try again.',
        oauth_missing_params: 'Invalid OAuth response. Please try again.',
      }
      toast.error(errorMap[params.get('error')!] || 'An error occurred.')
      window.history.replaceState({}, '', '/dashboard')
    }

    // Read active filter from URL on mount
    const filterParam = params.get('filter')
    if (filterParam) setActiveFilter(filterParam)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: accounts, refetch: refetchAccounts } = api.account.getAccounts.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })

  const activeAccountId = useMemo(() => {
    return accounts?.find(a => a.isActive)?.id
  }, [accounts])

  const { data: unreadCounts } = api.account.getUnreadCounts.useQuery(
    { accountId: activeAccountId! },
    {
      enabled: !!activeAccountId,
      refetchInterval: 60000,
      staleTime: 15000,
    }
  )

  const utils = api.useUtils()
  const refreshEmails = () => {
    utils.account.getEmails.invalidate()
  }

  const prefetchFolder = useCallback((folder: string) => {
    if (!activeAccountId) return
    // Optimistically prefetch the first page of the infinite query
    utils.account.getEmails.prefetchInfinite({
      accountId: activeAccountId,
      limit: 50,
      folder: folder as any,
    })
  }, [activeAccountId, utils])

  const deleteAccountMutation = api.account.deleteAccount.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      refetchAccounts()
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`)
    },
  })

  const handleDeleteAccount = (accountId: string, email: string) => {
    if (confirm(`Remove ${email}?`)) {
      deleteAccountMutation.mutate({ accountId })
    }
  }

  const smartFilterOptions = [
    { id: 'unread', label: 'Unread', icon: Mail },
    { id: 'important', label: 'Important', icon: Sparkles },
    { id: 'starred', label: 'Starred', icon: StarIcon },
    { id: 'has_attachments', label: 'Has Attachments', icon: Filter },
    { id: 'recent', label: 'Recent (24h)', icon: Clock },
  ]

  const handleFilterSelect = (filterId: string) => {
    setShowSmartFilters(false)
    if (activeFilter === filterId) {
      // Toggle off
      setActiveFilter(null)
      window.history.pushState({}, '', '/dashboard')
      window.dispatchEvent(new PopStateEvent('popstate'))
      toast.success('Filters cleared')
    } else {
      setActiveFilter(filterId)
      window.history.pushState({}, '', `/dashboard?filter=${filterId}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
      toast.success(`Filter: ${smartFilterOptions.find(f => f.id === filterId)?.label || filterId}`)
    }
    refreshEmails()
  }

  // Close smart filters dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSmartFilters) {
        const target = event.target as Element
        if (!target.closest('.smart-filters-dropdown')) {
          setShowSmartFilters(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSmartFilters])

  return (
    <>
      <div className="w-[260px] bg-[#F9FAFB] dark:bg-[#1E1E1E] border-r border-[#E5E7EB] dark:border-gray-800 flex flex-col h-full overflow-hidden text-[#111827] dark:text-gray-100">

        {/* Header */}
        <div className="p-4 pt-6 pb-4 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#000000] dark:bg-indigo-600 text-white rounded-md flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-gray-900 dark:text-gray-100">Inbox<span className="text-gray-400 dark:text-gray-500">IQ</span></span>
          </div>
          <div className="flex items-center gap-2">
            {isMounted && <ModeToggle />}
            {isMounted && <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-7 h-7 shadow-sm' } }} />}
          </div>
        </div>

        {/* Compose Button */}
        <div className="px-4 pb-4 flex-shrink-0">
          <Button
            className="w-full bg-[#111827] hover:bg-[#1F2937] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all"
            onClick={() => { setIsScheduleMode(false); setIsComposerOpen(true) }}
          >
            <Plus className="w-4 h-4" />
            New Message
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <div className="space-y-[2px]">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;

              let badgeCount = 0;
              if (unreadCounts) {
                if (item.folder === 'inbox') badgeCount = unreadCounts.inbox;
                else if (item.folder === 'starred') badgeCount = unreadCounts.starred;
                else if (item.folder === 'sent') badgeCount = unreadCounts.sent;
              }

              return (
                <Link key={item.label} href={item.href} prefetch={true}>
                  <button
                    onMouseEnter={() => prefetchFolder(item.folder)}
                    className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-colors group",
                    isActive
                      ? "bg-[#F3F4F6] dark:bg-[#1F2937] text-[#111827] dark:text-gray-100"
                      : "text-[#4B5563] dark:text-gray-400 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-gray-200"
                  )}>
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "w-[18px] h-[18px]",
                        isActive ? "text-[#111827] dark:text-gray-200" : "text-[#9CA3AF] dark:text-gray-500 group-hover:text-[#4B5563] dark:group-hover:text-gray-300"
                      )} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className={cn(
                        "min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center",
                        item.folder === 'inbox'
                          ? "bg-[#111827] dark:bg-indigo-600 text-white"
                          : "bg-[#E5E7EB] dark:bg-gray-800 text-[#4B5563] dark:text-gray-400"
                      )}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </button>
                </Link>
              );
            })}
          </div>

          <Separator className="my-5 bg-[#E5E7EB]" />

          {/* Connected Accounts */}
          <div className="mb-2 px-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#9CA3AF] dark:text-gray-500 tracking-wider uppercase">Accounts</span>
          </div>

          <div className="space-y-[2px]">
            {accounts?.map((account) => (
              <div key={account.id} className="group flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[6px] h-[6px] rounded-full bg-emerald-500"></div>
                  <span className="text-[12px] text-[#4B5563] dark:text-gray-400 font-medium truncate">{account.email}</span>
                </div>
                <button
                  onClick={() => handleDeleteAccount(account.id, account.email)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#9CA3AF] dark:text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <button
              onClick={() => setIsGmailModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-[#6B7280] dark:text-gray-400 font-medium hover:text-[#111827] dark:hover:text-gray-100 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors"
            >
              <Plus className="w-[18px] h-[18px] text-[#9CA3AF] dark:text-gray-500" />
              <span>Add account</span>
            </button>
          </div>

          <Separator className="my-5 bg-[#E5E7EB] dark:bg-gray-800" />

          {/* Tools */}
          <div className="mb-2 px-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#9CA3AF] dark:text-gray-500 tracking-wider uppercase">Tools</span>
          </div>

          <div className="space-y-[2px]">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#4B5563] dark:text-gray-400 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-gray-100 transition-colors group"
            >
              <Search className="w-[18px] h-[18px] text-[#9CA3AF] dark:text-gray-500 group-hover:text-[#4B5563] dark:group-hover:text-gray-300" />
              <span>Global Search</span>
            </button>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#4B5563] dark:text-gray-400 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-gray-100 transition-colors group"
            >
              <Calendar className="w-[18px] h-[18px] text-[#9CA3AF] dark:text-gray-500 group-hover:text-[#4B5563] dark:group-hover:text-gray-300" />
              <span>Schedule Meeting</span>
            </button>
            <button
              onClick={() => { setIsScheduleMode(true); setIsComposerOpen(true) }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#4B5563] dark:text-gray-400 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-gray-100 transition-colors group"
            >
              <Clock className="w-[18px] h-[18px] text-[#9CA3AF] dark:text-gray-500 group-hover:text-[#4B5563] dark:group-hover:text-gray-300" />
              <span>Schedule Send</span>
            </button>

            <div className="relative smart-filters-dropdown">
              <button
                onClick={() => setShowSmartFilters(!showSmartFilters)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group",
                  showSmartFilters || activeFilter
                    ? "bg-[#F3F4F6] dark:bg-[#1F2937] text-[#111827] dark:text-gray-100"
                    : "text-[#4B5563] dark:text-gray-400 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-gray-100"
                )}
              >
                <Filter className={cn(
                  "w-[18px] h-[18px]",
                  showSmartFilters || activeFilter ? "text-[#111827] dark:text-gray-200" : "text-[#9CA3AF] dark:text-gray-500 group-hover:text-[#4B5563] dark:group-hover:text-gray-300"
                )} />
                <span>Smart Filters</span>
                {activeFilter && (
                  <span className="ml-auto text-[10px] bg-[#3794FF] text-white px-1.5 py-0.5 rounded-full font-semibold">
                    ON
                  </span>
                )}
              </button>

              {showSmartFilters && (
                <div className="absolute left-full bottom-0 ml-2 w-52 bg-white dark:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden smart-filters-dropdown">
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-[#9CA3AF] dark:text-gray-500 uppercase tracking-wider px-2 py-1.5">Filter by</p>
                    {smartFilterOptions.map((filter) => {
                      const isFilterActive = activeFilter === filter.id
                      return (
                        <button
                          key={filter.id}
                          onClick={() => handleFilterSelect(filter.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                            isFilterActive
                              ? "bg-[#EEF2FF] dark:bg-blue-900/30 text-[#3794FF] dark:text-[#3794FF]"
                              : "text-[#4B5563] dark:text-gray-400 hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-gray-100"
                          )}
                        >
                          <filter.icon className="w-4 h-4" />
                          <span>{filter.label}</span>
                          {isFilterActive && (
                            <span className="ml-auto text-[#3794FF]">✓</span>
                          )}
                        </button>
                      )
                    })}
                    {activeFilter && (
                      <button
                        onClick={() => {
                          setShowSmartFilters(false)
                          setActiveFilter(null)
                          window.history.pushState({}, '', '/dashboard')
                          window.dispatchEvent(new PopStateEvent('popstate'))
                          refreshEmails()
                          toast.success('Filters cleared')
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors mt-1 border-t border-[#E5E7EB] pt-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Clear Filter</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmailComposer isOpen={isComposerOpen} onClose={() => { setIsComposerOpen(false); setIsScheduleMode(false) }} onEmailSent={refreshEmails} scheduleSend={isScheduleMode} />
      <AdvancedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectEmail={(emailId) => setIsSearchOpen(false)} />
      <GmailConnectModal isOpen={isGmailModalOpen} onClose={() => setIsGmailModalOpen(false)} onSuccess={refetchAccounts} />
      <CalendarIntegration isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </>
  )
}