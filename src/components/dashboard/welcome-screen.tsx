'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import {
  Mail,
  Plus,
  RefreshCw,
  CheckCircle,
  Sparkles,
  Bot,
  Search,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  MessageSquare,
  Star,
  Inbox,
  Loader2
} from 'lucide-react'
import { api } from '~/trpc/react'
import { toast } from 'sonner'
import { GmailConnectModal } from './gmail-connect-modal'

export function WelcomeScreen() {
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [showGmailModal, setShowGmailModal] = useState(false)

  const { data: accounts, refetch: refetchAccounts, error: accountsError } =
    api.account.getAccounts.useQuery(undefined, {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetching to recover from errors
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    })

  const utils = api.useUtils()

  const syncAccount = api.account.syncEmails.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || 'Account synced successfully!')
      refetchAccounts()
      utils.account.getUnreadCounts.invalidate()
    },
    onError: (error: any) => {
      console.error('Sync error:', error)
      toast.error(error.message || 'Failed to sync account')
    },
  })

  const handleConnectGmail = () => {
    setShowGmailModal(true)
  }

  const handleSyncAccount = (accountId: string) => {
    syncAccount.mutate({ accountId })
  }

  const handleGmailConnected = () => {
    refetchAccounts()
  }

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Assistance",
      description: "Smart email composition, summarization, and sentiment analysis",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Search,
      title: "Intelligent Search",
      description: "Find emails instantly with advanced semantic search",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Zap,
      title: "Smart Replies",
      description: "Generate contextual responses with AI assistance",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data stays secure with enterprise-grade encryption",
      color: "from-green-500 to-emerald-600"
    }
  ]

  const quickActions = [
    { icon: MessageSquare, label: "AI Chat", description: "Ask questions about your emails" },
    { icon: Search, label: "Advanced Search", description: "Find specific emails quickly" },
    { icon: Star, label: "Smart Filters", description: "Organize emails automatically" },
    { icon: Clock, label: "Schedule Send", description: "Send emails at the perfect time" }
  ]

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto py-16 px-4">
          <div className="w-16 h-16 bg-[#000000] rounded-2xl mx-auto flex items-center justify-center mb-8 shadow-sm">
            <Zap className="w-8 h-8 fill-white text-white" />
          </div>

          <h1 className="text-[36px] leading-tight font-bold text-[#111827] tracking-tight mb-4">
            Welcome to InboxIQ
          </h1>
          <p className="text-[16px] text-[#6B7280] leading-relaxed mb-10">
            Experience the future of email management with AI-powered assistance,
            smart organization, and intelligent automation.
          </p>

          {!accounts || accounts.length === 0 ? (
            <div className="flex flex-col items-center">
              <Button
                onClick={handleConnectGmail}
                disabled={isConnecting === 'gmail'}
                className="bg-[#111827] hover:bg-[#1F2937] text-white h-12 px-8 rounded-lg text-[15px] font-medium transition-all w-full max-w-[280px]"
              >
                {isConnecting === 'gmail' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Connect Gmail Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-[13px] text-[#9CA3AF] mt-4">
                Get started in seconds with secure Google integration
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-[#F0FDF4] border border-[#DCFCE7] text-[#16A34A] px-4 py-2 rounded-full text-[14px] font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Account Connected! Select an email to get started.</span>
            </div>
          )}
        </div>

        {/* Connected Accounts */}
        {accounts && accounts.length > 0 && (
          <div className="max-w-2xl mx-auto mb-16 px-4 w-full">
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-5 py-3.5">
                <h3 className="text-[14px] font-semibold text-[#111827] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  Connected Accounts
                </h3>
              </div>
              <div className="divide-y divide-[#E5E7EB]">
                {accounts.map((account: any) => (
                  <div key={account.id} className="flex flex-col sm:flex-row items-center justify-between p-5 gap-4">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="w-10 h-10 bg-[#F3F4F6] rounded flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-[#6B7280]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#111827] truncate">
                          {account.email}
                        </p>
                        <p className="text-[13px] text-[#6B7280]">
                          Synced {new Date(account.lastSyncAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleSyncAccount(account.id)}
                      disabled={syncAccount.isPending}
                      className="w-full sm:w-auto border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] h-9"
                    >
                      {syncAccount.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          <span>Sync Now</span>
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Uniform Feature Cards - All Same Size */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* Smart Replies Card */}
          <div className="group cursor-pointer h-24">
            <div className="h-full flex items-center space-x-3 p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 rounded-lg border border-orange-200/50 dark:border-orange-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Smart Replies
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                  Generate contextual responses with AI assistance
                </p>
              </div>
            </div>
          </div>

          {/* Secure & Private Card */}
          <div className="group cursor-pointer h-24">
            <div className="h-full flex items-center space-x-3 p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 rounded-lg border border-green-200/50 dark:border-green-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Secure & Private
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                  Your data stays secure with enterprise-grade encryption
                </p>
              </div>
            </div>
          </div>

          {/* AI-Powered Assistance Card */}
          <div className="group cursor-pointer h-24">
            <div className="h-full flex items-center space-x-3 p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-lg border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  AI-Powered Assistance
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                  Smart email composition, summarization, and sentiment analysis
                </p>
              </div>
            </div>
          </div>

          {/* Intelligent Search Card */}
          <div className="group cursor-pointer h-24">
            <div className="h-full flex items-center space-x-3 p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Intelligent Search
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                  Find emails instantly with advanced semantic search
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* AI Chat */}
            <div className="group cursor-pointer h-20">
              <div className="h-full p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-lg border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <MessageSquare className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-0.5">AI Chat</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">Ask questions about your emails</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Search */}
            <div className="group cursor-pointer h-20">
              <div className="h-full p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <Search className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-0.5">Advanced Search</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">Find specific emails quickly</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Filters */}
            <div className="group cursor-pointer h-20">
              <div className="h-full p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-lg border border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-0.5">Smart Filters</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">Organize emails automatically</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Send */}
            <div className="group cursor-pointer h-20">
              <div className="h-full p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-lg border border-amber-200/50 dark:border-amber-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-0.5">Schedule Send</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">Send emails at the perfect time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect New Account (if no accounts) */}
        {(!accounts || accounts.length === 0) && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Connect your Gmail account to unlock the full power of AI-assisted email management.
                </p>
                <Button
                  onClick={handleConnectGmail}
                  disabled={isConnecting === 'gmail'}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Connect Gmail Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gmail Connection Modal */}
        <GmailConnectModal
          isOpen={showGmailModal}
          onClose={() => setShowGmailModal(false)}
          onSuccess={handleGmailConnected}
        />
      </div>
    </div>
  )
}