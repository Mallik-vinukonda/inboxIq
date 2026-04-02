import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { aiService } from '~/lib/ai-service';
import { semanticSearch } from '~/lib/search';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        context: z.array(z.string()).optional(), // Email IDs for context
        useRAG: z.boolean().default(true), // Use Retrieval Augmented Generation
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      let contextEmails: any[] = [];
      let ragContext = '';

      // Use RAG to find relevant emails
      if (input.useRAG) {
        try {
          const searchResults = await semanticSearch(input.message, 5);
          const emailIds = searchResults.hits.map((hit: any) => hit.document.id);
          
          if (emailIds.length > 0) {
            contextEmails = await ctx.db.email.findMany({
              where: {
                id: { in: emailIds },
                account: {
                  userId: user.id,
                },
              },
              include: {
                addresses: true,
              },
              take: 5,
            });

            ragContext = contextEmails
              .map((email) => {
                const fromAddr = email.addresses.find((a: any) => a.type === 'from')?.address || 'Unknown';
                const cleanBody = email.body ? turndownService.turndown(email.body) : email.bodySnippet || '';
                return `Email from ${fromAddr} (${email.sentAt?.toLocaleDateString()}):
Subject: ${email.subject}
Content: ${cleanBody.substring(0, 500)}...`;
              })
              .join('\n\n');
          }
        } catch (error) {
          console.error('RAG search error:', error);
          // Continue without RAG context if search fails
        }
      }

      // Get specific context emails if provided
      if (input.context && input.context.length > 0) {
        const specificEmails = await ctx.db.email.findMany({
          where: {
            id: { in: input.context },
            account: {
              userId: user.id,
            },
          },
          include: {
            addresses: true,
          },
          take: 5,
        });

        const specificContext = specificEmails
          .map((email) => {
            const fromAddr = email.addresses.find((a: any) => a.type === 'from')?.address || 'Unknown';
            const cleanBody = email.body ? turndownService.turndown(email.body) : email.bodySnippet || '';
            return `Email from ${fromAddr} (${email.sentAt?.toLocaleDateString()}):
Subject: ${email.subject}
Content: ${cleanBody.substring(0, 500)}...`;
          })
          .join('\n\n');

        ragContext = specificContext + (ragContext ? '\n\n' + ragContext : '');
      }

      // Create system message with context
      const systemMessage = `You are the InboxIQ AI Assistant, a smart email companion built into this application. You have access to the user's email context when provided. Be helpful, concise, and professional.

${ragContext ? `Relevant emails from the user's inbox:\n${ragContext}\n\n` : ''}

About this application (InboxIQ):
- Tech Stack: Next.js 15, Turbopack, tRPC, TanStack Query, Prisma, PostgreSQL
- UI/UX: Radix UI, Tailwind CSS v4, Framer Motion, Tiptap Rich Text Editor
- Core Features: Schedule Send, Attachment Downloads, Emoji Picker, Server-Side Global Search, Smart Pagination
- AI Capabilities: Multi-Provider AI Strategy (Gemini, OpenAI, Mock), RAG Contextual Chat, Quick Actions (Summarize, Analyze Sentiment, Smart Reply, Compose)

Instructions:
- Answer questions about emails based on the provided context
- Help with email composition and management
- Explain the app's capabilities or tech stack if the user asks about them
- Provide insights about email patterns and important information
- If asked about specific information (dates, people, events), reference the relevant emails
- Be conversational but professional
- If you don't have enough context, ask clarifying questions`;

      try {
        console.log('🤖 Generating AI chat response...');
        const response = await aiService.generateChatResponse([
          { role: 'system', content: systemMessage },
          { role: 'user', content: input.message },
        ]);

        // Save interaction to database
        await ctx.db.chatInteraction.create({
          data: {
            userId: user.id,
            message: input.message,
            response,
          },
        });

        console.log('✅ AI chat response generated successfully');
        return { 
          response,
          contextUsed: contextEmails.length > 0,
          emailsReferenced: contextEmails.length,
        };
      } catch (error: any) {
        console.error('❌ AI chat response error:', error);
        
        // Provide specific error messages based on error type
        if (error?.message?.includes('API key')) {
          throw new Error('AI service configuration issue. Please check your API keys in the settings.');
        }
        if (error?.message?.includes('quota') || error?.message?.includes('overloaded')) {
          throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.');
        }
        if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
          throw new Error('Content was blocked by AI safety filters. Please try rephrasing your message.');
        }
        
        throw new Error('Failed to generate AI response. Please check your AI provider configuration.');
      }
    }),

  getInteractions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return ctx.db.chatInteraction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),

  composeEmail: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        context: z.string().optional(),
        tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('professional'),
        length: z.enum(['short', 'medium', 'long']).default('medium'),
        replyTo: z.object({
          subject: z.string(),
          from: z.string(),
          body: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      let contextString = input.context || '';
      
      if (input.replyTo) {
        contextString += `\n\nThis is a reply to an email:
From: ${input.replyTo.from}
Subject: ${input.replyTo.subject}
${input.replyTo.body ? `Original message: ${input.replyTo.body.substring(0, 300)}...` : ''}`;
      }

      try {
        console.log('🤖 Composing email with AI...');
        console.log('Prompt:', input.prompt);
        console.log('Tone:', input.tone);
        console.log('Length:', input.length);
        
        // Force use of Gemini since we know it's working for email composition
        const response = await aiService.composeEmail(
          input.prompt,
          contextString,
          input.tone,
          input.length,
          'gemini' // Force Gemini usage
        );
        
        console.log('✅ Email composed successfully');
        return { emailContent: response };
      } catch (error: any) {
        console.error('❌ Email composition error:', error);
        
        // Fallback to auto selection if Gemini fails
        try {
          console.log('🔄 Trying with auto provider selection...');
          const response = await aiService.composeEmail(
            input.prompt,
            contextString,
            input.tone,
            input.length,
            'auto'
          );
          console.log('✅ Fallback email composition successful');
          return { emailContent: response };
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError);
          
          // Provide specific error messages based on error type
          if (error?.message?.includes('API key') || fallbackError?.message?.includes('API key')) {
            throw new Error('AI service configuration issue. Please check your API keys in the settings.');
          }
          if (error?.message?.includes('quota') || error?.message?.includes('overloaded')) {
            throw new Error('AI service is temporarily unavailable due to high demand. Please try again in a few minutes.');
          }
          if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
            throw new Error('Content was blocked by AI safety filters. Please try rephrasing your message.');
          }
          
          throw new Error('Failed to generate email content. Please check your AI provider configuration.');
        }
      }
    }),

  summarizeEmails: protectedProcedure
    .input(
      z.object({
        emailIds: z.array(z.string()),
        summaryType: z.enum(['brief', 'detailed', 'action_items']).default('brief'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const emails = await ctx.db.email.findMany({
        where: {
          id: { in: input.emailIds },
          account: {
            userId: user.id,
          },
        },
        include: {
          addresses: true,
        },
        take: 10, // Limit to prevent token overflow
      });

      if (emails.length === 0) {
        throw new Error('No emails found');
      }

      const emailsText = emails
        .map((email) => {
          const fromAddr = email.addresses.find((a: any) => a.type === 'from')?.address || 'Unknown';
          const cleanBody = email.body ? turndownService.turndown(email.body) : email.bodySnippet || '';
          return `Email ${email.id}:
From: ${fromAddr}
Date: ${email.sentAt?.toLocaleDateString()}
Subject: ${email.subject}
Content: ${cleanBody.substring(0, 800)}...
---`;
        })
        .join('\n\n');

      try {
        const summary = await aiService.summarizeEmails(emailsText, input.summaryType);
        return { summary, emailCount: emails.length };
      } catch (error: any) {
        console.error('AI API error:', error);
        throw new Error('Failed to generate email summary');
      }
    }),

  analyzeEmailSentiment: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const email = await ctx.db.email.findUnique({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
        include: {
          addresses: true,
        },
      });

      if (!email) {
        throw new Error('Email not found');
      }

      const emailContent = email.body || email.bodySnippet || '';
      const cleanContent = turndownService.turndown(emailContent);

      try {
        const analysis = await aiService.analyzeEmailSentiment(
          cleanContent,
          email.subject || 'No Subject'
        );
        return analysis;
      } catch (error: any) {
        console.error('AI API error:', error);
        throw new Error('Failed to analyze email sentiment');
      }
    }),

  analyzeEmail: protectedProcedure
    .input(z.object({ 
      emailId: z.string(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      console.log('🔍 analyzeEmail mutation called for:', input.subject?.substring(0, 50));

      try {
        // Try Gemini first
        console.log('🤖 Analyzing email with Gemini...');
        const analysis = await aiService.analyzeEmailSentiment(
          input.body,
          input.subject,
          'gemini'
        );
        console.log('✅ Email analysis complete with Gemini');
        return { ...analysis, isFromMock: false };
      } catch (geminiError: any) {
        console.log('⚠️ Gemini failed for analysis, falling back to mock:', geminiError.message);
        try {
          // Fallback to mock
          const analysis = await aiService.analyzeEmailSentiment(
            input.body,
            input.subject,
            'mock'
          );
          console.log('✅ Email analysis complete with mock');
          return { ...analysis, isFromMock: true };
        } catch (mockError: any) {
          console.error('❌ Both Gemini and mock failed for analyzeEmail:', mockError);
          throw new Error('Failed to analyze email. Please try again.');
        }
      }
    }),

  summarizeEmail: protectedProcedure
    .input(z.object({
      emailId: z.string(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('🔍 summarizeEmail mutation called with input:', {
        emailId: input.emailId,
        subject: input.subject?.substring(0, 50) + '...',
        bodyLength: input.body?.length || 0,
        hasBody: !!input.body,
      });

      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        console.error('❌ User not found for clerkId:', ctx.auth.userId);
        throw new Error('User not found');
      }

      console.log('✅ User found:', user.id);

      try {
        // Create a focused, CONCISE summary prompt
        const summaryPrompt = `Summarize this email in 2-3 short sentences. Be direct and factual — no headers, no bullets, no numbered lists. Just plain text.

Subject: ${input.subject}
Content: ${input.body.substring(0, 2000)}

Summary (2-3 sentences max):`;

        console.log('🤖 Generating summary with Gemini...');
        
        try {
          // Try Gemini first
          const summary = await aiService.generateText(summaryPrompt, undefined, 'gemini');
          console.log('✅ Summary generated successfully with Gemini:', summary.substring(0, 100) + '...');
          return { summary, isFromMock: false };
        } catch (geminiError: any) {
          console.log('⚠️ Gemini failed, falling back to mock summary:', geminiError.message);
          
          // Fallback to mock summary
          const mockSummary = await aiService.generateText(summaryPrompt, undefined, 'mock');
          console.log('✅ Mock summary generated successfully');
          return { summary: mockSummary, isFromMock: true };
        }
      } catch (error: any) {
        console.error('❌ AI API error in summarizeEmail:', error);
        
        // Provide more specific error information
        if (error?.message?.includes('API key')) {
          throw new Error('AI service configuration issue. Please check your API keys.');
        }
        if (error?.message?.includes('quota') || error?.message?.includes('overloaded')) {
          throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.');
        }
        if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
          throw new Error('Content was blocked by AI safety filters. Please try rephrasing.');
        }
        
        throw new Error(`Failed to summarize email: ${error?.message || 'Unknown error'}`);
      }
    }),

  generateSmartReply: protectedProcedure
    .input(z.object({
      emailId: z.string(),
      context: z.object({
        originalSubject: z.string(),
        originalBody: z.string(),
        senderName: z.string(),
        senderEmail: z.string(),
      }),
      replyType: z.enum(['quick_acknowledge', 'detailed_response', 'ask_clarification', 'schedule_meeting', 'custom']).default('detailed_response'),
      customPrompt: z.string().optional(),
      tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('professional'),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get conversation context (same as existing generateReply)
      const currentEmail = await ctx.db.email.findUnique({
        where: { id: input.emailId },
        include: {
          thread: true,
          addresses: true,
          account: true,
        },
      });

      if (!currentEmail) {
        throw new Error('Email not found');
      }

      let contextPrompt = '';
      
      // Build different prompts based on reply type
      switch (input.replyType) {
        case 'quick_acknowledge':
          contextPrompt = `Write a brief acknowledgment email that:
- Confirms you received their message
- Thanks them for reaching out
- Indicates when you'll provide a full response (if needed)
- Maintains a ${input.tone} tone`;
          break;
          
        case 'detailed_response':
          contextPrompt = `Write a comprehensive response that:
- Addresses all points raised in their email
- Provides helpful information or answers
- Asks follow-up questions if needed
- Maintains a ${input.tone} tone`;
          break;
          
        case 'ask_clarification':
          contextPrompt = `Write a polite email asking for clarification that:
- Acknowledges their message
- Asks specific questions about unclear points
- Explains why you need clarification
- Maintains a ${input.tone} tone`;
          break;
          
        case 'schedule_meeting':
          contextPrompt = `Write an email to schedule a meeting that:
- References their message
- Suggests meeting to discuss the topic
- Offers time slots or asks for their availability
- Maintains a ${input.tone} tone`;
          break;
          
        case 'custom':
          contextPrompt = input.customPrompt || 'Write a helpful response to this email';
          break;
      }

      const fullPrompt = `${contextPrompt}

Original Email:
From: ${input.context.senderName} (${input.context.senderEmail})
Subject: ${input.context.originalSubject}
Content: ${input.context.originalBody}

Write only the email body (no subject line). Be natural and helpful.`;

      try {
        console.log('🤖 Generating smart reply with Gemini...');
        
        try {
          // Try Gemini first
          const reply = await aiService.generateText(fullPrompt, undefined, 'gemini');
          console.log('✅ Smart reply generated successfully with Gemini');
          return { 
            reply,
            replyType: input.replyType,
            suggestedSubject: input.context.originalSubject.startsWith('Re:') 
              ? input.context.originalSubject 
              : `Re: ${input.context.originalSubject}`,
            isFromMock: false,
            quotaExceeded: false
          };
        } catch (geminiError: any) {
          console.log('⚠️ Gemini failed, falling back to mock reply:', geminiError.message);
          
          // Fallback to mock reply
          const reply = await aiService.generateText(fullPrompt, undefined, 'mock');
          console.log('✅ Mock smart reply generated successfully');
          return { 
            reply,
            replyType: input.replyType,
            suggestedSubject: input.context.originalSubject.startsWith('Re:') 
              ? input.context.originalSubject 
              : `Re: ${input.context.originalSubject}`,
            isFromMock: true,
            quotaExceeded: geminiError.message.includes('quota')
          };
        }
      } catch (error: any) {
        console.error('❌ AI smart reply error:', error);
        
        // Provide specific error messages based on error type
        if (error?.message?.includes('API key')) {
          throw new Error('AI service configuration issue. Please check your API keys in the settings.');
        }
        if (error?.message?.includes('quota') || error?.message?.includes('overloaded')) {
          throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.');
        }
        if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
          throw new Error('Content was blocked by AI safety filters. Please try rephrasing your message.');
        }
        
        throw new Error('Failed to generate smart reply. Please check your AI provider configuration.');
      }
    }),

  generateReply: protectedProcedure
    .input(z.object({
      emailId: z.string(),
      context: z.object({
        originalSubject: z.string(),
        originalBody: z.string(),
        senderName: z.string(),
        senderEmail: z.string(),
      }),
      tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('professional'),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get the current email with thread information
      const currentEmail = await ctx.db.email.findUnique({
        where: { id: input.emailId },
        include: {
          thread: true,
          addresses: true,
          account: true,
        },
      });

      if (!currentEmail) {
        throw new Error('Email not found');
      }

      let threadContext = '';
      let conversationHistory: any[] = [];

      // If this email is part of a thread, get the conversation history
      if (currentEmail.threadId) {
        conversationHistory = await ctx.db.email.findMany({
          where: {
            threadId: currentEmail.threadId,
            account: {
              userId: user.id,
            },
          },
          include: {
            addresses: true,
          },
          orderBy: {
            sentAt: 'asc',
          },
          take: 10, // Limit to last 10 emails in thread
        });

        // Build conversation context
        threadContext = conversationHistory
          .map((email, index) => {
            const fromAddr = email.addresses.find((a: any) => a.type === 'from');
            const toAddrs = email.addresses.filter((a: any) => a.type === 'to');
            const cleanBody = email.body ? turndownService.turndown(email.body) : email.bodySnippet || '';
            
            return `[Message ${index + 1}] ${email.sentAt?.toLocaleDateString()}
From: ${fromAddr?.name || fromAddr?.address || 'Unknown'}
To: ${toAddrs.map((a: any) => a.name || a.address).join(', ')}
Subject: ${email.subject || 'No Subject'}
Content: ${cleanBody.substring(0, 800)}${cleanBody.length > 800 ? '...' : ''}
---`;
          })
          .join('\n\n');
      }

      // Get recent email history between the same participants for additional context
      const senderEmail = input.context.senderEmail;
      const recentEmails = await ctx.db.email.findMany({
        where: {
          account: {
            userId: user.id,
          },
          addresses: {
            some: {
              address: senderEmail,
              type: 'from',
            },
          },
          id: { not: input.emailId }, // Exclude current email
        },
        include: {
          addresses: true,
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: 3, // Last 3 emails from this sender
      });

      let senderHistory = '';
      if (recentEmails.length > 0) {
        senderHistory = recentEmails
          .map((email) => {
            const cleanBody = email.body ? turndownService.turndown(email.body) : email.bodySnippet || '';
            return `Previous email from ${input.context.senderName} (${email.sentAt?.toLocaleDateString()}):
Subject: ${email.subject}
Content: ${cleanBody.substring(0, 400)}${cleanBody.length > 400 ? '...' : ''}`;
          })
          .join('\n\n');
      }

      // Enhanced prompt with full context
      const systemPrompt = `You are an AI assistant helping to compose a thoughtful email reply. You have access to the full conversation context and should use it to write a contextually appropriate response.

CONVERSATION CONTEXT:
${threadContext ? `Thread History:\n${threadContext}\n\n` : ''}

${senderHistory ? `Recent Email History with ${input.context.senderName}:\n${senderHistory}\n\n` : ''}

CURRENT EMAIL TO REPLY TO:
From: ${input.context.senderName} (${input.context.senderEmail})
Subject: ${input.context.originalSubject}
Content: ${input.context.originalBody}

INSTRUCTIONS:
- Write a ${input.tone} reply that acknowledges the current message
- Reference relevant points from the conversation history when appropriate
- Address any questions, requests, or action items mentioned
- Maintain consistency with the conversation tone and relationship
- Be concise but thorough
- Include appropriate greeting and closing
- If this is a continuation of a discussion, acknowledge previous points
- If there are unresolved items from earlier messages, address them appropriately

Return only the email body content (no subject line). Make it natural and contextually aware.`;

      const userPrompt = `Please generate an appropriate reply to the current email, taking into account the full conversation context and history with this person.`;

      try {
        console.log('🤖 Generating AI reply with Gemini...');
        console.log('📧 Reply context:', {
          senderEmail: input.context.senderEmail,
          hasThreadContext: !!currentEmail.threadId,
          threadEmails: conversationHistory.length,
          recentEmails: recentEmails.length,
        });

        try {
          // Try Gemini first
          const reply = await aiService.generateChatResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ], { provider: 'gemini' });
          
          console.log('✅ AI reply generated successfully with Gemini');
          return { 
            reply,
            contextUsed: {
              threadEmails: conversationHistory.length,
              recentEmails: recentEmails.length,
              hasThreadContext: !!currentEmail.threadId,
            },
            isFromMock: false,
            quotaExceeded: false
          };
        } catch (geminiError: any) {
          console.log('⚠️ Gemini failed, falling back to mock reply:', geminiError.message);
          
          // Fallback to mock reply
          const reply = await aiService.generateChatResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ], { provider: 'mock' });
          
          console.log('✅ Mock AI reply generated successfully');
          return { 
            reply,
            contextUsed: {
              threadEmails: conversationHistory.length,
              recentEmails: recentEmails.length,
              hasThreadContext: !!currentEmail.threadId,
            },
            isFromMock: true,
            quotaExceeded: geminiError.message.includes('quota')
          };
        }
      } catch (error: any) {
        console.error('❌ AI reply generation error:', error);
        
        // Try with a simpler fallback approach using mock directly
        try {
          console.log('🔄 Trying simplified reply generation with mock...');
          
          const fallbackPrompt = `Write a ${input.tone} email reply to this message:

From: ${input.context.senderName}
Subject: ${input.context.originalSubject}
Message: ${input.context.originalBody}

Instructions:
- Write a ${input.tone} reply
- Address the main points in their message
- Be helpful and appropriate
- Include proper greeting and closing
- Keep it concise but complete`;

          // Use mock for fallback
          const fallbackReply = await aiService.generateText(fallbackPrompt, undefined, 'mock');
          
          console.log('✅ Mock fallback reply generated successfully');
          return { 
            reply: fallbackReply,
            contextUsed: {
              threadEmails: 0,
              recentEmails: 0,
              hasThreadContext: false,
            },
            isFromMock: true,
            quotaExceeded: error?.message?.includes('quota') || false
          };
        } catch (fallbackError: any) {
          console.error('❌ Fallback reply generation also failed:', fallbackError);
          
          // Provide a helpful error message based on the error type
          if (error?.message?.includes('API key') || fallbackError?.message?.includes('API key')) {
            throw new Error('AI service configuration issue. Please check your API keys in the settings.');
          }
          if (error?.message?.includes('quota') || error?.message?.includes('overloaded')) {
            throw new Error('AI service is temporarily unavailable due to high demand. Please try again in a few minutes.');
          }
          if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
            throw new Error('Content was blocked by AI safety filters. Please try rephrasing your message.');
          }
          
          throw new Error('Failed to generate AI reply. Please try again or check your AI service configuration.');
        }
      }
    }),
});