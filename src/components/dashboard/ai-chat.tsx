'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Send, Bot, User, X, MessageCircle } from 'lucide-react'
import { api } from '~/trpc/react'
import { useEmailContext } from './email-context'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export function AIChat() {
  const { selectedEmail, emailContext } = useEmailContext()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your InboxIQ assistant. I can help you summarize emails, analyze sentiment, craft smart replies, schedule meetings, or answer questions about the app's tech stack (Next.js, Turbopack, Orama RAG, etc.). Ask me anything!",
      role: 'assistant',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add email context message when an email is selected
  useEffect(() => {
    if (selectedEmail) {
      const contextMessage: Message = {
        id: `context_${selectedEmail.id}`,
        content: `📧 Viewing: "${selectedEmail.subject || 'No Subject'}" from ${selectedEmail.addresses?.find((a: any) => a.type === 'from')?.address || selectedEmail.from?.address || 'Unknown'}. Ask me anything!`,
        role: 'assistant',
        timestamp: new Date(),
      }

      setMessages(prev => {
        const hasContext = prev.some(msg => msg.id === contextMessage.id)
        if (hasContext) return prev
        return [...prev, contextMessage]
      })
    }
  }, [selectedEmail])

  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString() + '_assistant',
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    },
    onError: (error) => {
      console.error('Error sending message:', error)

      let errorMessage = 'Unknown error occurred.'

      if (error.message.includes('overloaded') || error.message.includes('503')) {
        errorMessage = '🤖 AI service is busy. Please try again shortly.'
      } else if (error.message.includes('quota') || error.message.includes('429')) {
        errorMessage = '⏰ AI quota reached. Please try again later.'
      } else if (error.message.includes('API key')) {
        errorMessage = '🔑 AI service configuration issue.'
      } else {
        errorMessage = `❌ ${error.message}`
      }

      const errorMessageObj: Message = {
        id: Date.now().toString() + '_error',
        content: errorMessage,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessageObj])
    },
  })

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])

    const contextIds = selectedEmail ? [selectedEmail.id] : undefined

    sendMessage.mutate({
      message: input,
      context: contextIds,
      useRAG: true
    })
    setInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-5 z-50 w-[370px] h-[480px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          style={{
            animation: 'slideUp 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#111827] to-[#1e293b] text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold leading-tight">InboxIQ Assistant</p>
                <p className="text-[11px] text-white/60">AI-powered email help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </div>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-[#4F46E5] text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Bot className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2.5 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your emails..."
                disabled={sendMessage.isPending}
                className="text-[13px] h-9 rounded-lg border-gray-200 dark:border-gray-700 focus-visible:ring-[#4F46E5]"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMessage.isPending}
                size="sm"
                className="h-9 w-9 p-0 bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800 text-white'
            : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white'
        }`}
        title="InboxIQ Assistant"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </button>

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  )
}