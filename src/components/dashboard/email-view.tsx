'use client'

import React, { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Star,
  MoreVertical,
  Paperclip,
  Bot,
  Sparkles,
  Eye,
  Loader2,
  ArchiveRestore,
  RotateCcw,
  FileText,
  MessageSquare,
  Clock,
  HelpCircle,
  Calendar,
  X
} from 'lucide-react'
import { EmailComposer } from './email-composer'
import { CalendarIntegration } from './calendar-integration'
import { sanitizeHtml } from '~/lib/sanitize-html'
import { toast } from 'sonner'
import { api } from '~/trpc/react'
import { useRouter } from 'next/navigation'

interface EmailViewProps {
  email?: {
    id: string
    subject: string | null
    body: string | null
    bodySnippet: string | null
    sentAt: Date | null
    receivedAt: Date | null
    isRead: boolean
    isStarred: boolean
    isImportant: boolean
    isArchived?: boolean
    isDeleted?: boolean
    orengoMessageId: string
    accountId: string
    addresses: Array<{
      id: string
      type: string
      name: string | null
      address: string
    }>
    attachments?: Array<{
      id: string
      filename: string
      size: number | null
      mimeType: string | null
      contentId: string | null
    }>
  }
  folder?: 'inbox' | 'sent' | 'starred' | 'archive' | 'trash'
  onClose?: () => void
}

export function EmailView({ email, folder = 'inbox', onClose }: EmailViewProps) {
  const router = useRouter()
  const [showComposer, setShowComposer] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [showAiAnalysis, setShowAiAnalysis] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiReplyDraft, setAiReplyDraft] = useState<string>('')
  const [aiReplyContext, setAiReplyContext] = useState<any>(null)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)

  // New states for email summary and smart reply
  const [emailSummary, setEmailSummary] = useState<string>('')
  const [showSummary, setShowSummary] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showSmartReplyOptions, setShowSmartReplyOptions] = useState(false)
  const [selectedReplyType, setSelectedReplyType] = useState<'quick_acknowledge' | 'detailed_response' | 'ask_clarification' | 'schedule_meeting' | 'custom'>('detailed_response')

  // Calendar integration states
  const [showCalendarIntegration, setShowCalendarIntegration] = useState(false)
  const [meetingText, setMeetingText] = useState('')

  // Mutations for email actions
  const archiveMutation = api.account.archiveEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const unarchiveMutation = api.account.unarchiveEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const moveToTrashMutation = api.account.moveToTrash.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const restoreFromTrashMutation = api.account.restoreFromTrash.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const permanentDeleteMutation = api.account.permanentlyDeleteEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const toggleStarMutation = api.account.toggleStar.useMutation({
    onSuccess: (data) => {
      toast.success(data.isStarred ? 'Email starred' : 'Email unstarred')
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // AI analysis mutation
  const analyzeEmailMutation = api.chat.analyzeEmail.useMutation({
    onSuccess: (data) => {
      setAiAnalysis(data)
      setIsAnalyzing(false)
      setShowAiAnalysis(true)
      toast.success('AI analysis complete!')
    },
    onError: (error) => {
      console.error('AI analysis error:', error)
      setIsAnalyzing(false)
      toast.error('Failed to analyze email')
    },
  })

  // Email summary mutation
  const summarizeEmailMutation = api.chat.summarizeEmail.useMutation({
    onSuccess: (data) => {
      console.log('✅ Email summary received:', data.summary.substring(0, 100) + '...');
      setEmailSummary(data.summary);
      setIsSummarizing(false);
      setShowSummary(true);
      toast.success('Email summary generated!');
    },
    onError: (error) => {
      console.error('❌ Email summary error:', error);
      setIsSummarizing(false);
      toast.error(`Failed to summarize email: ${error.message}`);
    },
  });

  // Smart reply mutation
  const generateSmartReplyMutation = api.chat.generateSmartReply.useMutation({
    onSuccess: (data) => {
      if (selectedReplyType === 'schedule_meeting') {
        // For schedule meeting, open calendar integration instead of composer
        setMeetingText(data.reply)
        setShowCalendarIntegration(true)
        setIsGeneratingReply(false)
        setShowSmartReplyOptions(false)
        toast.success('Meeting details generated! Set up your calendar event.')
      } else {
        // For other reply types, use the composer
        setAiReplyDraft(data.reply)
        setAiReplyContext({ replyType: data.replyType, suggestedSubject: data.suggestedSubject })
        setIsGeneratingReply(false)
        setShowSmartReplyOptions(false)
        setShowComposer(true)
        toast.success(`${data.replyType.replace('_', ' ')} generated!`)
      }
    },
    onError: (error) => {
      console.error('Smart reply generation error:', error)
      setIsGeneratingReply(false)
      toast.error('Failed to generate smart reply')
    },
  })

  // Reset all AI state when the selected email changes
  // This prevents stale summaries/analyses from appearing on a different email
  React.useEffect(() => {
    setEmailSummary('');
    setShowSummary(false);
    setIsSummarizing(false);
    setAiAnalysis(null);
    setShowAiAnalysis(false);
    setIsAnalyzing(false);
    setAiReplyDraft('');
    setAiReplyContext(null);
    setShowSmartReplyOptions(false);
  }, [email?.id]);

  // Close smart reply options when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSmartReplyOptions) {
        const target = event.target as Element
        if (!target.closest('.smart-reply-dropdown')) {
          setShowSmartReplyOptions(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSmartReplyOptions])

  const handleAiAnalysis = () => {
    if (!email) return
    setIsAnalyzing(true)
    analyzeEmailMutation.mutate({
      emailId: email.id,
      subject: email.subject || '',
      body: email.body || email.bodySnippet || '',
    })
  }

  const handleArchive = () => {
    if (!email) return
    if (email.isArchived) {
      unarchiveMutation.mutate({ emailId: email.id })
    } else {
      archiveMutation.mutate({ emailId: email.id })
    }
  }

  const handleTrash = () => {
    if (!email) return
    if (email.isDeleted) {
      // If in trash, show options for restore or permanent delete
      if (confirm('Restore this email to inbox?')) {
        restoreFromTrashMutation.mutate({ emailId: email.id })
      }
    } else {
      moveToTrashMutation.mutate({ emailId: email.id })
    }
  }

  const handlePermanentDelete = () => {
    if (!email) return
    if (confirm('Permanently delete this email? This action cannot be undone.')) {
      permanentDeleteMutation.mutate({ emailId: email.id })
    }
  }

  const handleToggleStar = () => {
    if (!email) return
    toggleStarMutation.mutate({ emailId: email.id })
  }
  const handleAiReply = () => {
    setShowSmartReplyOptions(true)
  }

  const handleSmartReply = (replyType: typeof selectedReplyType, customPrompt?: string) => {
    if (!email) return
    setIsGeneratingReply(true)
    setSelectedReplyType(replyType)

    const fromAddress = email.addresses.find(addr => addr.type === 'from')
    const context = {
      originalSubject: email.subject || '',
      originalBody: email.body || email.bodySnippet || '',
      senderName: fromAddress?.name || fromAddress?.address || 'Unknown',
      senderEmail: fromAddress?.address || '',
    }

    generateSmartReplyMutation.mutate({
      emailId: email.id,
      context,
      replyType,
      customPrompt,
      tone: 'professional',
    })
  }

  const handleSummarizeEmail = () => {
    if (!email) {
      console.error('❌ handleSummarizeEmail: No email object');
      return;
    }

    console.log('🔍 handleSummarizeEmail called with email:', {
      id: email.id,
      subject: email.subject?.substring(0, 50) + '...',
      hasBody: !!email.body,
      hasBodySnippet: !!email.bodySnippet,
      bodyLength: (email.body || email.bodySnippet || '').length,
    });

    const mutationInput = {
      emailId: email.id,
      subject: email.subject || '',
      body: email.body || email.bodySnippet || '',
    };

    console.log('📤 Calling summarizeEmail mutation with:', {
      emailId: mutationInput.emailId,
      subject: mutationInput.subject.substring(0, 50) + '...',
      bodyLength: mutationInput.body.length,
    });

    setIsSummarizing(true);
    summarizeEmailMutation.mutate(mutationInput);
  }

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#1E1E1E]">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-200 dark:bg-[#252526] rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-500 dark:text-gray-500" />
          </div>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Select an email to view</p>
        </div>
      </div>
    )
  }

  const fromAddress = email.addresses.find(addr => addr.type === 'from')
  const toAddresses = email.addresses.filter(addr => addr.type === 'to')
  const ccAddresses = email.addresses.filter(addr => addr.type === 'cc')

  const fromName = fromAddress?.name || fromAddress?.address || 'Unknown'
  const toNames = toAddresses.map(addr => addr.name || addr.address).join(', ')

  const displayTime = email.receivedAt || email.sentAt
  const timeString = displayTime
    ? new Date(displayTime).toLocaleString()
    : ''

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1E1E1E]">
      {/* Clean Modern Header */}
      <div className="bg-white dark:bg-[#1E1E1E] border-b border-[#E5E7EB] dark:border-gray-800 pt-6 pb-4 px-8 flex-shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-[22px] leading-tight font-semibold text-[#111827] dark:text-gray-100 tracking-tight">
              {email.subject || '(No Subject)'}
            </h1>
            {email.isImportant && (
              <div className="inline-flex items-center mt-2 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/50">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></div>
                <span className="text-[11px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Important</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="ghost" size="sm" onClick={handleSummarizeEmail} disabled={isSummarizing}
              className="h-8 md:px-3 text-[#4B5563] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-100 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] rounded-md transition-colors"
              title="Summarize Email"
            >
              {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 md:mr-2" />}
              <span className="hidden md:inline text-[13px] font-medium">Summarize</span>
            </Button>
            <Button
              variant="ghost" size="sm" onClick={handleAiAnalysis} disabled={isAnalyzing}
              className="h-8 md:px-3 text-[#4B5563] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-100 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] rounded-md transition-colors"
              title="AI Analysis"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 md:mr-2" />}
              <span className="hidden md:inline text-[13px] font-medium">Analyze</span>
            </Button>

            <div className="w-[1px] h-4 bg-[#E5E7EB] dark:bg-gray-700 mx-1"></div>

            <Button
              variant="ghost" size="sm" onClick={handleToggleStar} disabled={toggleStarMutation.isPending}
              className={`h-8 w-8 p-0 rounded-md transition-colors ${email.isStarred ? 'text-[#F59E0B] hover:bg-[#FFFBEB] dark:hover:bg-amber-900/20 hover:text-[#D97706]' : 'text-[#9CA3AF] dark:text-gray-500 hover:text-[#4B5563] dark:hover:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                }`}
              title={email.isStarred ? 'Remove Star' : 'Add Star'}
            >
              <Star className={`w-[18px] h-[18px] ${email.isStarred ? 'fill-current' : ''}`} />
            </Button>

            {folder !== 'trash' && (
              <Button
                variant="ghost" size="sm" onClick={handleArchive} disabled={archiveMutation.isPending || unarchiveMutation.isPending}
                className="h-8 w-8 p-0 text-[#9CA3AF] dark:text-gray-500 hover:text-[#4B5563] dark:hover:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] rounded-md transition-colors"
                title={email.isArchived ? 'Move to Inbox' : 'Archive'}
              >
                {email.isArchived ? <ArchiveRestore className="w-[18px] h-[18px]" /> : <Archive className="w-[18px] h-[18px]" />}
              </Button>
            )}

            {folder === 'trash' ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost" size="sm" onClick={handleTrash} disabled={restoreFromTrashMutation.isPending}
                  className="h-8 px-3 text-[#4B5563] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-100 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span className="text-[13px] font-medium">Restore</span>
                </Button>
                <Button
                  variant="ghost" size="sm" onClick={handlePermanentDelete} disabled={permanentDeleteMutation.isPending}
                  className="h-8 px-3 text-[#EF4444] dark:text-red-400 hover:text-[#DC2626] dark:hover:text-red-300 hover:bg-[#FEF2F2] dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="text-[13px] font-medium">Delete Forever</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost" size="sm" onClick={handleTrash} disabled={moveToTrashMutation.isPending}
                className="h-8 w-8 p-0 text-[#9CA3AF] dark:text-gray-500 hover:text-[#EF4444] dark:hover:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Move to Trash"
              >
                <Trash2 className="w-[18px] h-[18px]" />
              </Button>
            )}
          </div>
        </div>

        {/* Sender Info Row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Minimal Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#F3F4F6] dark:bg-[#252526] border border-[#E5E7EB] dark:border-gray-800 flex items-center justify-center text-[#4B5563] dark:text-gray-300 font-medium text-[13px] flex-shrink-0">
              {fromName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-[#111827] dark:text-gray-200 text-[14px] truncate">{fromName}</span>
                <span className="text-[13px] text-[#9CA3AF] dark:text-gray-500 truncate">&lt;{email.addresses.find(a => a.type === 'from')?.address}&gt;</span>
              </div>
              <div className="text-[13px] text-[#6B7280] dark:text-gray-500 flex items-center gap-1.5 truncate mt-0.5">
                <span>to {toNames || 'me'}</span>
                {ccAddresses.length > 0 && <span>, cc {ccAddresses.map(addr => addr.name || addr.address).join(', ')}</span>}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end">
            <span className="text-[12px] font-medium text-[#9CA3AF] dark:text-gray-500">{timeString}</span>
            {!email.isRead && (
              <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-[#3B82F6] dark:bg-indigo-500"></span>
            )}
          </div>
        </div>
      </div>

      {/* Content — scrollable, contains AI panels + email body */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1E1E1E]">

        {/* AI Analysis Panel */}
        {showAiAnalysis && aiAnalysis && (
          <div className="mx-8 mt-6">
            <Card className="border-[#E0E7FF] dark:border-indigo-900/50 bg-[#EEF2FF] dark:bg-indigo-900/20 shadow-none rounded-xl">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm flex items-center">
                  <div className="w-7 h-7 bg-white dark:bg-indigo-900/40 rounded-md flex items-center justify-center mr-2.5 shadow-sm">
                    <Bot className="w-4 h-4 text-[#3794FF] dark:text-[#3794FF]" />
                  </div>
                  <span className="text-[#111827] dark:text-gray-100 font-semibold">AI Analysis</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowAiAnalysis(false)} className="ml-auto text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-indigo-900/40 h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={aiAnalysis.sentiment === 'positive' ? 'default' : aiAnalysis.sentiment === 'negative' ? 'destructive' : 'secondary'} className="font-medium">
                      {aiAnalysis.sentiment.charAt(0).toUpperCase() + aiAnalysis.sentiment.slice(1)}
                    </Badge>
                    <Badge variant="outline" className="font-medium bg-white dark:bg-[#1E1E1E] dark:border-gray-800 dark:text-gray-300">
                      {aiAnalysis.urgency.charAt(0).toUpperCase() + aiAnalysis.urgency.slice(1)} Priority
                    </Badge>
                    <span className="text-xs text-[#3794FF] dark:text-[#3794FF] font-semibold bg-white dark:bg-blue-900/30 px-2 py-1 rounded-full border border-[#E0E7FF] dark:border-indigo-800/50">
                      {Math.round(aiAnalysis.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="bg-white dark:bg-[#1E1E1E]/50 rounded-lg p-3.5 border border-[#E0E7FF] dark:border-indigo-900/30">
                    <p className="text-sm font-semibold text-[#111827] dark:text-gray-200 mb-2.5">
                      Tone <span className="text-[#6B7280] dark:text-gray-500 font-normal ml-1">— {aiAnalysis.tone}</span>
                    </p>
                    {aiAnalysis.key_emotions?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.key_emotions.map((emotion: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-[11px] bg-[#F9FAFB] dark:bg-gray-800/50 text-[#4B5563] dark:text-gray-400 border-[#E5E7EB] dark:border-gray-700 font-medium">
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {aiAnalysis.summary && (
                    <div className="bg-white dark:bg-[#1E1E1E]/50 rounded-lg p-3.5 border border-[#E0E7FF] dark:border-indigo-900/30">
                      <p className="text-[13px] text-[#4B5563] dark:text-gray-300 leading-relaxed">
                        {aiAnalysis.summary}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Summary Panel */}
        {(showSummary && emailSummary) || isSummarizing ? (
          <div className="mx-8 mt-6">
            <Card className="border-[#DCFCE7] dark:border-emerald-900/50 bg-[#F0FDF4] dark:bg-emerald-900/20 shadow-none rounded-xl">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm flex items-center">
                  <div className="w-7 h-7 bg-white dark:bg-emerald-900/40 rounded-md flex items-center justify-center mr-2.5 shadow-sm">
                    <FileText className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                  </div>
                  <span className="text-[#111827] dark:text-gray-100 font-semibold">AI Summary</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)} disabled={isSummarizing} className="ml-auto text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-emerald-900/40 h-8 w-8 p-0">
                    {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                {isSummarizing ? (
                  <div className="flex items-center space-x-3 bg-white dark:bg-[#1E1E1E]/50 rounded-lg p-4 border border-[#DCFCE7] dark:border-emerald-900/30">
                    <Loader2 className="w-5 h-5 animate-spin text-[#16A34A] dark:text-emerald-400" />
                    <span className="text-[13px] text-[#4B5563] dark:text-gray-400">Analyzing email content...</span>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#1E1E1E]/50 rounded-lg p-4 border border-[#DCFCE7] dark:border-emerald-900/30">
                    <div className="text-[13px] text-[#4B5563] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {emailSummary}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="px-8 py-8">
          <div className="prose prose-slate dark:prose-invert max-w-[800px] text-[15px] prose-p:leading-relaxed prose-a:text-[#2563EB] dark:prose-a:text-[#3794FF]">
            {email.body ? (
              <div 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body || '') }} 
                className="text-[#111827] dark:text-gray-300 dark:bg-white/5 dark:p-4 dark:rounded-xl" 
              />
            ) : (
              <p className="text-[#6B7280] dark:text-gray-500 italic bg-[#F9FAFB] dark:bg-gray-800/30 p-5 rounded-xl border border-[#E5E7EB] dark:border-gray-800">
                {email.bodySnippet || 'No content available'}
              </p>
            )}
          </div>

          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[#E5E7EB] dark:border-gray-800 max-w-[800px]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-gray-200 mb-4 flex items-center">
                <Paperclip className="w-4 h-4 mr-2" />
                Attachments ({email.attachments.length})
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {email.attachments.map((attachment) => (
                  <a 
                    key={attachment.id} 
                    href={attachment.contentId ? `/api/attachments/${email.orengoMessageId}/${attachment.contentId}?filename=${encodeURIComponent(attachment.filename)}&mimeType=${encodeURIComponent(attachment.mimeType || '')}&accountId=${email.accountId}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 bg-white dark:bg-[#252526] rounded-xl border border-[#E5E7EB] dark:border-gray-800 hover:border-[#D1D5DB] dark:hover:border-gray-600 transition-all group shadow-sm hover:shadow cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-[#F3F4F6] dark:bg-[#1E293B] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#E5E7EB] dark:group-hover:bg-[#334155] transition-colors">
                        <Paperclip className="w-5 h-5 text-[#6B7280] dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-[#3794FF] transition-colors">{attachment.filename}</p>
                        <p className="text-[12px] text-[#6B7280] dark:text-gray-500">{formatFileSize(attachment.size || 0)}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions Layer */}
      <div className="bg-white dark:bg-[#1E1E1E] border-t border-[#E5E7EB] dark:border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-[800px] mx-auto md:mx-0">
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowComposer(true)} className="bg-[#111827] dark:bg-gray-100 hover:bg-[#1F2937] dark:hover:bg-white text-white dark:text-gray-900 shadow-sm h-10 px-5 rounded-lg text-sm font-medium">
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" className="border-[#E5E7EB] dark:border-gray-700 text-[#4B5563] dark:text-gray-300 hover:bg-[#F9FAFB] dark:hover:bg-[#2D2D30] hover:text-[#111827] dark:hover:text-gray-100 h-10 px-4 rounded-lg bg-transparent">
              <ReplyAll className="w-4 h-4 mr-2" />
              Reply All
            </Button>
            <Button variant="outline" className="border-[#E5E7EB] dark:border-gray-700 text-[#4B5563] dark:text-gray-300 hover:bg-[#F9FAFB] dark:hover:bg-[#2D2D30] hover:text-[#111827] dark:hover:text-gray-100 h-10 px-4 rounded-lg bg-transparent">
              <Forward className="w-4 h-4 mr-2" />
              Forward
            </Button>
          </div>

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowSmartReplyOptions(!showSmartReplyOptions)}
              disabled={isGeneratingReply}
              className="border-[rgba(79,70,229,0.3)] dark:border-indigo-500/30 text-[#3794FF] dark:text-[#3794FF] hover:bg-[#EEF2FF] dark:hover:bg-blue-900/30 hover:border-[#3794FF] dark:hover:border-[#3794FF] h-10 px-4 rounded-lg bg-[#EEF2FF]/50 dark:bg-indigo-900/10"
            >
              {isGeneratingReply ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Smart Reply
            </Button>

            {showSmartReplyOptions && (
              <div className="smart-reply-dropdown absolute bottom-full right-0 mb-3 w-72 bg-white dark:bg-[#252526] border border-[#E5E7EB] dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-4">
                  <h3 className="text-[14px] font-semibold text-[#111827] dark:text-gray-100 mb-3 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-[#3794FF] dark:text-[#3794FF]" />
                    Choose Reply Type
                  </h3>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left p-2.5 h-auto hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] border-none rounded-lg"
                      onClick={() => handleSmartReply('quick_acknowledge')}
                      disabled={isGeneratingReply}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded bg-[#DBEAFE] dark:bg-blue-900/40 flex flex-shrink-0 items-center justify-center mt-0.5">
                          <Clock className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-200">Quick Acknowledgment</p>
                          <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Brief confirmation response</p>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left p-2.5 h-auto hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] border-none rounded-lg"
                      onClick={() => handleSmartReply('detailed_response')}
                      disabled={isGeneratingReply}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded bg-[#DCFCE7] dark:bg-emerald-900/40 flex flex-shrink-0 items-center justify-center mt-0.5">
                          <MessageSquare className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-200">Detailed Response</p>
                          <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Comprehensive reply</p>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left p-2.5 h-auto hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] border-none rounded-lg"
                      onClick={() => handleSmartReply('ask_clarification')}
                      disabled={isGeneratingReply}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded bg-[#FEF3C7] dark:bg-amber-900/40 flex flex-shrink-0 items-center justify-center mt-0.5">
                          <HelpCircle className="w-4 h-4 text-[#D97706] dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-200">Ask Clarification</p>
                          <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Request more info</p>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left p-2.5 h-auto hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] border-none rounded-lg"
                      onClick={() => handleSmartReply('schedule_meeting')}
                      disabled={isGeneratingReply}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded bg-[#F3E8FF] dark:bg-purple-900/40 flex flex-shrink-0 items-center justify-center mt-0.5">
                          <Calendar className="w-4 h-4 text-[#9333EA] dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-200">Schedule Meeting</p>
                          <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Propose a time</p>
                        </div>
                      </div>
                    </Button>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-gray-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-100 hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]"
                      onClick={() => setShowSmartReplyOptions(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Composer */}
      {showComposer && (
        <EmailComposer
          isOpen={showComposer}
          onClose={() => {
            setShowComposer(false)
            setAiReplyDraft('')
            setAiReplyContext(null)
          }}
          replyTo={{
            threadId: email.id,
            subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || '(No Subject)'}`,
            to: [fromAddress?.address || ''],
          }}
          aiDraft={aiReplyDraft}
          aiContext={aiReplyContext}
        />
      )}

      {/* Calendar Integration Modal */}
      <CalendarIntegration
        isOpen={showCalendarIntegration}
        onClose={() => setShowCalendarIntegration(false)}
        initialMeetingText={meetingText}
        senderEmail={email?.addresses.find(addr => addr.type === 'from')?.address || ''}
        onMeetingScheduled={(meetingDetails) => {
          console.log('Meeting scheduled:', meetingDetails)
          toast.success('Meeting details prepared! Use the calendar options to schedule.')
        }}
      />
    </div>
  )
}