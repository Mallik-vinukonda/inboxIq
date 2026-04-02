'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import EmojiPicker from 'emoji-picker-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import {
  Send,
  Paperclip,
  Smile,
  Bold,
  Italic,
  List,
  ListOrdered,
  Zap,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Reply,
  Clock
} from 'lucide-react'
import { api } from '~/trpc/react'
import { toast } from 'sonner'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  replyTo?: {
    threadId: string
    subject: string
    to: string[]
  }
  aiDraft?: string
  aiContext?: {
    threadEmails: number
    recentEmails: number
    hasThreadContext: boolean
  }
  onEmailSent?: () => void
  scheduleSend?: boolean
}

export function EmailComposer({ isOpen, onClose, replyTo, aiDraft, aiContext, onEmailSent, scheduleSend = false }: EmailComposerProps) {
  const [to, setTo] = useState<string[]>(replyTo?.to || [])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState(replyTo?.subject || '')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isAiAssisting, setIsAiAssisting] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your email...',
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: aiDraft || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl dark:prose-invert mx-auto focus:outline-none min-h-[200px] p-4 bg-white dark:bg-[#1E1E1E] text-[#111827] dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-b-xl',
      },
    },
  })

  // Get user accounts to send from
  const { data: accounts } = api.account.getAccounts.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Send email mutation
  const sendEmailMutation = api.account.sendEmail.useMutation({
    onSuccess: (data) => {
      console.log('✅ Email sent successfully:', data)
      toast.success('Email sent successfully!')
      onEmailSent?.() // Call the callback to refresh email lists
      onClose()
      // Reset form
      setTo(replyTo?.to || [])
      setCc([])
      setBcc([])
      setSubject(replyTo?.subject || '')
      if (editor) {
        editor.commands.clearContent()
      }
    },
    onError: (error) => {
      console.error('❌ Send email error:', error)
      console.error('Error details:', {
        message: error.message,
        data: error.data,
        shape: error.shape
      })
      toast.error(`Failed to send email: ${error.message}`)
    },
  })

  const composeWithAI = api.chat.composeEmail.useMutation({
    onSuccess: (data) => {
      if (editor) {
        // Parse the AI response to extract subject and body
        const lines = data.emailContent.split('\n')
        const subjectLine = lines.find(line => line.toLowerCase().startsWith('subject:'))
        if (subjectLine) {
          setSubject(subjectLine.replace(/^subject:\s*/i, ''))
        }

        // Set the body content (everything after subject)
        const bodyStartIndex = lines.findIndex(line => line.toLowerCase().startsWith('subject:'))
        const bodyContent = lines.slice(bodyStartIndex + 1).join('\n').trim()
        editor.commands.setContent(bodyContent)
      }
      setIsAiAssisting(false)
      toast.success('AI has helped compose your email!')
    },
    onError: (error) => {
      console.error('AI composition error:', error)
      setIsAiAssisting(false)
      toast.error('Failed to get AI assistance')
    },
  })

  // Debug send button state
  useEffect(() => {
    const canSend = to.length > 0 && subject.trim().length > 0 && !sendEmailMutation.isPending
    console.log('🔍 Send button state:', {
      hasRecipients: to.length > 0,
      hasSubject: subject.trim().length > 0,
      isPending: sendEmailMutation.isPending,
      canSend,
      recipients: to,
      subject: subject
    })
  }, [to, subject, sendEmailMutation.isPending])

  // Update editor content when AI draft is provided
  useEffect(() => {
    if (aiDraft && editor && !editor.getHTML().includes(aiDraft.substring(0, 50))) {
      editor.commands.setContent(aiDraft)
    }
  }, [aiDraft, editor])

  const handleAiCompose = () => {
    const currentBody = editor?.getText().trim()
      ? `\nHere is what I have written so far. Please improve it, expand it, or finish it:\n${editor.getText()}`
      : ''

    const context = `
      To: ${to.join(', ')}
      Subject: ${subject}
      ${replyTo ? `This is a reply to a thread about: ${replyTo.subject}` : ''}
    `

    const prompt = subject.trim()
      ? `Help me compose a professional email with the subject "${subject}" to ${to.join(', ')}.${currentBody}`
      : `Help me compose a professional email to ${to.join(', ')}.${currentBody}`

    setIsAiAssisting(true)
    composeWithAI.mutate({ prompt, context })
  }

  const addRecipient = (email: string, type: 'to' | 'cc' | 'bcc') => {
    console.log(`🔍 Adding recipient: "${email}" to ${type}`)

    if (!email.trim()) {
      console.log('❌ Email is empty, not adding')
      return
    }

    const setter = type === 'to' ? setTo : type === 'cc' ? setCc : setBcc
    const current = type === 'to' ? to : type === 'cc' ? cc : bcc

    if (!current.includes(email.trim())) {
      const newRecipients = [...current, email.trim()]
      setter(newRecipients)
      console.log(`✅ Added recipient. New ${type} list:`, newRecipients)
    } else {
      console.log(`⚠️  Recipient already exists in ${type} list`)
    }
  }

  const removeRecipient = (email: string, type: 'to' | 'cc' | 'bcc') => {
    const setter = type === 'to' ? setTo : type === 'cc' ? setCc : setBcc
    const current = type === 'to' ? to : type === 'cc' ? cc : bcc
    setter(current.filter(e => e !== email))
  }

  const handleSend = () => {
    if (!editor) return

    console.log('🚀 Starting email send process...')

    // Validate required fields
    if (to.length === 0) {
      console.log('❌ Validation failed: No recipients')
      toast.error('Please add at least one recipient')
      return
    }

    if (!subject.trim()) {
      console.log('❌ Validation failed: No subject')
      toast.error('Please add a subject')
      return
    }

    // Get the first available account
    const account = accounts?.[0]
    if (!account) {
      console.log('❌ Validation failed: No account connected')
      toast.error('No email account connected. Please connect a Gmail account in the sidebar first.')
      return
    }

    console.log('✅ Validation passed, preparing email data...')
    console.log('Account:', account.email)
    console.log('To:', to)
    console.log('Subject:', subject)

    const content = editor.getHTML()

    // Convert string arrays to proper format
    const toRecipients = to.map(email => ({ address: email }))
    const ccRecipients = cc.length > 0 ? cc.map(email => ({ address: email })) : undefined
    const bccRecipients = bcc.length > 0 ? bcc.map(email => ({ address: email })) : undefined

    const emailData = {
      accountId: account.id,
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: subject.trim(),
      body: content,
      threadId: replyTo?.threadId,
      scheduledAt: scheduleSend && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
    }

    console.log('📧 Sending email with data:', emailData)

    sendEmailMutation.mutate(emailData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      <Card className={`w-full max-w-2xl bg-white dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-gray-800 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'
        } shadow-2xl border-2 rounded-xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <CardHeader className="pb-2 bg-gray-50 dark:bg-[#252526] border-b border-[#E5E7EB] dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-[#111827] dark:text-gray-100 flex items-center">
              {replyTo ? 'Reply' : 'New Message'}
              {aiDraft && (
                <Badge variant="secondary" className="ml-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Draft
                </Badge>
              )}
              {replyTo && (
                <Badge variant="outline" className="ml-2">
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="flex flex-col flex-1 min-h-0 p-0">
            {/* AI Context Information */}
            {aiDraft && aiContext && (
              <div className="mx-4 mt-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span className="font-medium">AI Context Used:</span>
                    <span className="ml-2">
                      {aiContext.threadEmails > 0 && `${aiContext.threadEmails} thread messages`}
                      {aiContext.threadEmails > 0 && aiContext.recentEmails > 0 && ', '}
                      {aiContext.recentEmails > 0 && `${aiContext.recentEmails} recent emails`}
                      {aiContext.threadEmails === 0 && aiContext.recentEmails === 0 && 'Current email only'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recipients */}
            <div className="p-4 space-y-3 border-b border-[#E5E7EB] dark:border-gray-800 bg-white dark:bg-[#1E1E1E] flex-shrink-0">
              {/* To Field */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium w-12 text-gray-700 dark:text-gray-300">To:</span>
                <div className="flex-1 flex flex-wrap items-center gap-1">
                  {to.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-none">
                      {email}
                      <button onClick={() => removeRecipient(email, 'to')}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    placeholder="Type email and press Enter..."
                    className="border-none shadow-none flex-1 min-w-[200px] bg-transparent text-[#111827] dark:text-gray-100 placeholder:text-gray-400 focus-visible:ring-0 px-0 h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const email = e.currentTarget.value.trim()
                        if (email) {
                          addRecipient(email, 'to')
                          e.currentTarget.value = ''
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const email = e.currentTarget.value.trim()
                      if (email) {
                        addRecipient(email, 'to')
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  {!showCc && (
                    <Button variant="ghost" size="sm" onClick={() => setShowCc(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                      Cc
                    </Button>
                  )}
                  {!showBcc && (
                    <Button variant="ghost" size="sm" onClick={() => setShowBcc(true)}>
                      Bcc
                    </Button>
                  )}
                </div>
              </div>

              {/* CC Field */}
              {showCc && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-12">Cc:</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {cc.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button onClick={() => removeRecipient(email, 'cc')}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      placeholder="Type email and press Enter..."
                      className="border-none shadow-none flex-1 min-w-[200px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const email = e.currentTarget.value.trim()
                          if (email) {
                            addRecipient(email, 'cc')
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const email = e.currentTarget.value.trim()
                        if (email) {
                          addRecipient(email, 'cc')
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* BCC Field */}
              {showBcc && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-12">Bcc:</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {bcc.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button onClick={() => removeRecipient(email, 'bcc')}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      placeholder="Type email and press Enter..."
                      className="border-none shadow-none flex-1 min-w-[200px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const email = e.currentTarget.value.trim()
                          if (email) {
                            addRecipient(email, 'bcc')
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const email = e.currentTarget.value.trim()
                        if (email) {
                          addRecipient(email, 'bcc')
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="flex items-center space-x-2 pt-1 border-t border-[#E5E7EB] dark:border-gray-800/60 mt-2">
                <span className="text-sm font-medium w-12 text-gray-700 dark:text-gray-300">Subject:</span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="border-none shadow-none bg-transparent text-[#111827] dark:text-gray-100 placeholder:text-gray-400 focus-visible:ring-0 px-0 h-8 font-medium"
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-[#E5E7EB] dark:border-gray-800 bg-gray-50 dark:bg-[#252526] flex-shrink-0">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : ''}`}
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${editor?.isActive('italic') ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : ''}`}
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${editor?.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : ''}`}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${editor?.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : ''}`}
                >
                  <ListOrdered className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAiCompose}
                disabled={isAiAssisting}
                className="flex items-center space-x-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              >
                <Zap className="w-4 h-4" />
                <span>{isAiAssisting ? 'AI Writing...' : 'AI Assist'}</span>
              </Button>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <EditorContent editor={editor} className="h-full" />
            </div>

            {/* Schedule Send Date/Time Picker */}
            {scheduleSend && (
              <div className="px-4 py-3 border-t bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="text-[12px] font-semibold text-amber-700 dark:text-amber-300 block mb-1">Schedule Send Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full text-[13px] px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
                {scheduledDateTime && new Date(scheduledDateTime) <= new Date() && (
                  <p className="text-[11px] text-red-500 mt-1.5 ml-7">Please choose a future date and time</p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#E5E7EB] dark:border-gray-800 bg-white dark:bg-[#1E1E1E] flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="relative">
                  <Button variant="ghost" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Smile className="w-4 h-4" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-lg overflow-hidden">
                      <EmojiPicker 
                        onEmojiClick={(emojiData) => {
                          if (editor) {
                            editor.commands.insertContent(emojiData.emoji)
                          }
                          setShowEmojiPicker(false)
                        }}
                        width={300}
                        height={400}
                      />
                    </div>
                  )}
                </div>
                {(!to.length || !subject.trim()) && (
                  <div className="text-xs text-muted-foreground ml-2">
                    {!to.length && !subject.trim() ? 'Add recipients and subject' :
                      !to.length ? 'Add recipients' :
                        'Add subject'}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={onClose} disabled={isScheduling} className="border-[#E5E7EB] dark:border-gray-700 text-[#4B5563] dark:text-gray-300 hover:bg-[#F9FAFB] dark:hover:bg-[#2D2D30] bg-transparent">
                  Cancel
                </Button>
                {scheduleSend ? (
                  <Button
                    onClick={() => {
                      if (!scheduledDateTime) {
                        toast.error('Please select a date and time to schedule')
                        return
                      }
                      
                      const schedDate = new Date(scheduledDateTime)
                      const now = new Date()
                      
                      if (schedDate <= now) {
                        toast.error('Please choose a future date and time')
                        return
                      }
                      
                      // Now sending to backend to be scheduled by the cron job
                      setIsScheduling(true)
                      
                      handleSend()
                      
                      // Note: The success toast is handled by the mutation onSuccess in handleSend
                      setIsScheduling(false)
                    }}
                    disabled={!to.length || !subject.trim() || sendEmailMutation.isPending || isScheduling || !scheduledDateTime || new Date(scheduledDateTime) <= new Date()}
                    className={`bg-amber-600 hover:bg-amber-700 text-white ${(!to.length || !subject.trim() || !scheduledDateTime) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {sendEmailMutation.isPending || isScheduling ? 'Scheduling...' :
                      scheduledDateTime ? `Schedule · ${new Date(scheduledDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` :
                      'Schedule Send'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!to.length || !subject.trim() || sendEmailMutation.isPending}
                    className={!to.length || !subject.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                    title={
                      !to.length ? 'Add at least one recipient' :
                        !subject.trim() ? 'Add a subject line' :
                          sendEmailMutation.isPending ? 'Sending email...' :
                            'Send email'
                    }
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}