'use client'

import { useState, useEffect } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Search, Filter, MoreVertical, Star, RefreshCw, Mail, MailOpen, X } from 'lucide-react'
import { api } from '~/trpc/react'
import { toast } from 'sonner'
import React from 'react'



interface EmailListProps {
  selectedEmailId?: string | null;
  onEmailSelect?: (emailId: string) => void;
  folder?: 'inbox' | 'sent' | 'starred' | 'archive' | 'trash';
}

export function EmailList({ selectedEmailId, onEmailSelect, folder = 'inbox' }: EmailListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const utils = api.useUtils()

  // Listen for filter changes from URL
  useEffect(() => {
    const readFilter = () => {
      const params = new URLSearchParams(window.location.search)
      setActiveFilter(params.get('filter'))
    }
    readFilter()
    window.addEventListener('popstate', readFilter)
    return () => window.removeEventListener('popstate', readFilter)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: accounts } = api.account.getAccounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — already fetched by sidebar
    refetchOnWindowFocus: false,
  });

  const { data: searchResults, isLoading: isSearchLoading } = api.account.searchEmails.useQuery(
    { query: debouncedQuery, accountId: accounts?.[0]?.id || '', limit: 50 },
    { enabled: debouncedQuery.length > 0 && !!accounts?.[0]?.id }
  );

  const { 
    data: emailsData, 
    isLoading: isEmailsLoading, 
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.account.getEmails.useInfiniteQuery({
    accountId: accounts?.[0]?.id || '',
    limit: 50,
    folder: folder,
  }, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!accounts?.[0]?.id,
    staleTime: 60000, // 60s cache — prevents refetch on route change
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const syncMutation = api.account.syncEmails.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setLastSyncTime(new Date());
      refetch();
      utils.account.getUnreadCounts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const syncRecentMutation = api.account.syncEmails.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setLastSyncTime(new Date());
      refetch();
      utils.account.getUnreadCounts.invalidate();
    },
    onError: (error) => {
      console.error('❌ Sync error:', error);
      if (error.message.includes('UNAUTHORIZED')) {
        toast.error('Please sign in again to sync your emails');
      } else if (error.message.includes('User not found')) {
        toast.error('Please sign out and sign back in');
      } else if (error.message.includes('Email account not found')) {
        toast.error('Please reconnect your Gmail account');
      } else if (error.message.includes('not properly configured')) {
        toast.error('Please reconnect your Gmail account');
      } else {
        toast.error(`Sync failed: ${error.message}`);
      }
    },
  });

  const handleSync = () => {
    if (accounts && accounts.length > 0 && accounts[0]) {
      syncRecentMutation.mutate({ accountId: accounts[0].id });
    }
  };

  // Function to generate avatar color based on sender name/email
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-emerald-500 to-emerald-600',
      'from-rose-500 to-rose-600',
      'from-amber-500 to-amber-600',
      'from-cyan-500 to-cyan-600',
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const emails = debouncedQuery.length > 0 
    ? (searchResults || []) 
    : (emailsData?.pages.flatMap((page) => page.emails) || []);

  const isLoading = debouncedQuery.length > 0 ? isSearchLoading : isEmailsLoading;

  // Apply search filter (now acts mostly as client-side fallback until debounced API returns)
  let filteredEmails = emails.filter(email =>
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.addresses.some(addr =>
      addr.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addr.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || email.bodySnippet?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply smart filter
  if (activeFilter) {
    filteredEmails = filteredEmails.filter(email => {
      switch (activeFilter) {
        case 'unread':
          return !email.isRead
        case 'important':
          return email.isImportant
        case 'starred':
          return email.isStarred
        case 'has_attachments':
          return email.attachments && email.attachments.length > 0
        case 'recent':
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          const emailDate = email.receivedAt || email.sentAt
          return emailDate ? new Date(emailDate) >= dayAgo : false
        default:
          return true
      }
    })
  }

  const clearFilter = () => {
    setActiveFilter(null)
    window.history.pushState({}, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const filterLabels: Record<string, string> = {
    unread: 'Unread',
    important: 'Important',
    starred: 'Starred',
    has_attachments: 'Has Attachments',
    recent: 'Recent (24h)',
  }

  // Format relative time
  const getRelativeTime = (date: Date | string | null) => {
    if (!date) return '';
    const now = new Date();
    const emailDate = new Date(date);
    const diffMs = now.getTime() - emailDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-[#1E1E1E]">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-[#3794FF] dark:text-[#3794FF] mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-gray-400">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1E1E1E]">
      {/* Compact Header */}
      <div className="border-b border-slate-200 dark:border-gray-800 px-4 py-3 flex-shrink-0">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100 capitalize">{folder}</h2>
            <span className="text-xs bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
              {filteredEmails.length}
            </span>
            {filteredEmails.filter(e => !e.isRead).length > 0 && (
              <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-[#3794FF] dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                {filteredEmails.filter(e => !e.isRead).length} new
              </span>
            )}
          </div>

          {/* Active Filter Badge */}
          {activeFilter && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-500 dark:text-gray-400">Filter:</span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 dark:bg-indigo-900/40 text-[#3794FF] dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium border border-indigo-100 dark:border-indigo-800/50">
                {filterLabels[activeFilter] || activeFilter}
                <button onClick={clearFilter} className="hover:text-indigo-900 dark:hover:text-indigo-100 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            {folder === 'inbox' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncMutation.isPending || syncRecentMutation.isPending}
                className="h-8 w-8 p-0 text-slate-500 hover:text-[#3794FF] dark:text-gray-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-blue-900/30 transition-colors"
                title="Sync emails"
              >
                <RefreshCw className={`w-4 h-4 ${(syncMutation.isPending || syncRecentMutation.isPending) ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 focus-visible:ring-1 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-all text-slate-900 dark:text-gray-100"
          />
        </div>

        {lastSyncTime && folder === 'inbox' && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
            Synced {getRelativeTime(lastSyncTime)} ago
          </p>
        )}
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmails.length === 0 ? (
          <div className="p-8 text-center mt-10">
            {emails.length === 0 ? (
              <div className="max-w-sm mx-auto">
                <div className="w-14 h-14 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Mail className="w-6 h-6 text-slate-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">
                  No emails yet
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-gray-400 mb-6 leading-relaxed">
                  {folder === 'inbox'
                    ? "Your inbox is currently empty. Click the sync button above to securely fetch your latest messages."
                    : `Your ${folder} folder is currently empty. Emails will appear here when available.`
                  }
                </p>
                {accounts && accounts.length > 0 && folder === 'inbox' && (
                  <Button
                    onClick={handleSync}
                    disabled={syncMutation.isPending || syncRecentMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-2 ${(syncMutation.isPending || syncRecentMutation.isPending) ? 'animate-spin' : ''}`} />
                    Sync Emails
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <Search className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No matching emails</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredEmails.map((email) => {
              const fromAddress = email.addresses.find(addr => addr.type === 'from');
              const fromName = fromAddress?.name || fromAddress?.address?.split('@')[0] || 'Unknown';
              const fromEmail = fromAddress?.address || '';
              const isSelected = selectedEmailId === email.id;
              const isUnread = !email.isRead;

              return (
                <div
                  key={email.id}
                  onClick={() => onEmailSelect?.(email.id)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-gray-800 transition-colors duration-150 ${isSelected
                    ? 'bg-blue-50 dark:bg-indigo-900/20 border-l-[3px] border-l-[#3794FF] dark:border-l-indigo-500'
                    : isUnread
                      ? 'bg-white dark:bg-[#1E1E1E] hover:bg-slate-50 dark:hover:bg-[#2D2D30] border-l-[3px] border-l-transparent'
                      : 'bg-white dark:bg-[#1E1E1E] hover:bg-slate-50 dark:hover:bg-[#2D2D30] border-l-[3px] border-l-transparent opacity-80'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 bg-gradient-to-br ${getAvatarColor(fromName)} rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 mt-0.5 shadow-sm`}>
                      {fromName.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm truncate mr-2 ${isUnread ? 'font-bold text-slate-900 dark:text-gray-100' : 'font-medium text-slate-700 dark:text-gray-300'}`}>
                          {fromName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {email.isStarred && (
                            <Star className="w-3 h-3 text-amber-500 fill-current drop-shadow-sm" />
                          )}
                          <span className="text-[11px] text-slate-400 dark:text-gray-500 tabular-nums">
                            {getRelativeTime(email.receivedAt || email.sentAt)}
                          </span>
                        </div>
                      </div>

                      <h3 className={`text-[13px] truncate mb-0.5 ${isUnread ? 'font-semibold text-slate-900 dark:text-gray-100' : 'text-slate-700 dark:text-gray-400'}`}>
                        {email.subject || '(No Subject)'}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-gray-500 truncate leading-relaxed">
                        {email.bodySnippet || 'No preview available'}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {isUnread && (
                      <div className="w-2 h-2 bg-[#3794FF] dark:bg-blue-500 rounded-full flex-shrink-0 mt-2 shadow-sm" />
                    )}
                  </div>
                </div>
              );
            })}
            
            {hasNextPage && debouncedQuery.length === 0 && (
              <div className="p-4 flex justify-center border-t border-slate-100 dark:border-gray-800 bg-white dark:bg-[#1E1E1E]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-full px-6 shadow-sm bg-white dark:bg-[#252526] border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-gray-300"
                >
                  {isFetchingNextPage ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#3794FF] dark:text-[#3794FF]" />
                      Loading older emails...
                    </>
                  ) : (
                    'Load older emails'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}