import OpenAI from 'openai';
import { env } from '~/env';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export class OpenAIService {
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      // Validate API key
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-key-here') {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.');
      }

      const messages: any[] = [];
      
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      
      messages.push({ role: 'user', content: prompt });

      console.log('Sending request to OpenAI API...');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response || response.trim() === '') {
        throw new Error('OpenAI API returned empty response');
      }
      
      return response;
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Handle specific OpenAI API errors
      if (error?.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.');
      }
      if (error?.status === 429) {
        throw new Error('OpenAI API quota exceeded. Please try again later.');
      }
      if (error?.status === 400) {
        throw new Error('Invalid request to OpenAI API. Please try rephrasing your message.');
      }
      
      // Generic error handling
      const errorMessage = error?.message || 'Unknown error occurred';
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages as any[],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('OpenAI returned empty response');
      }
      
      return response;
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error('Failed to generate chat response from OpenAI');
    }
  }

  async composeEmail(
    prompt: string,
    context?: string,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional',
    length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<string> {
    const systemInstruction = `You are an AI email composition assistant. Help the user write clear, appropriate emails.

Tone: ${tone}
Length: ${length}

${context ? `Additional context: ${context}\n\n` : ''}

Instructions:
- Generate a complete email with subject line and body
- Match the requested tone and length
- Be professional and clear
- Include appropriate greetings and closings
- Format as: Subject: [subject line] followed by the email body
- Do not include any explanations or meta-text`;

    return this.generateText(prompt, systemInstruction);
  }

  async summarizeEmails(
    emailsText: string,
    summaryType: 'brief' | 'detailed' | 'action_items' = 'brief'
  ): Promise<string> {
    const systemInstruction = `You are an AI assistant that summarizes emails. Create a ${summaryType} summary of the provided emails.

${summaryType === 'brief' ? 'Provide a concise overview of the main topics and key points.' : ''}
${summaryType === 'detailed' ? 'Provide a comprehensive summary with important details and context.' : ''}
${summaryType === 'action_items' ? 'Focus on action items, deadlines, and tasks mentioned in the emails.' : ''}

Format the summary clearly and professionally.`;

    return this.generateText(`Please summarize these emails:\n\n${emailsText}`, systemInstruction);
  }

  async analyzeEmailSentiment(emailContent: string, subject: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    tone: string;
    key_emotions: string[];
    urgency: 'low' | 'medium' | 'high';
    summary: string;
  }> {
    const systemInstruction = `You are an AI assistant that analyzes email sentiment and tone. Analyze the provided email and return a JSON response with:
- sentiment: "positive", "negative", or "neutral"
- confidence: number between 0 and 1
- tone: brief description of the tone
- key_emotions: array of detected emotions
- urgency: "low", "medium", or "high"
- summary: brief explanation of the analysis

Respond only with valid JSON.`;

    try {
      const response = await this.generateText(
        `Analyze this email:\n\nSubject: ${subject}\n\nContent: ${emailContent}`,
        systemInstruction
      );
      
      // Strip markdown code brackets if the model returned them
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to parse JSON response
      const analysis = JSON.parse(cleanResponse);
      return analysis;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        tone: 'Unable to analyze',
        key_emotions: [],
        urgency: 'medium',
        summary: 'Analysis failed',
      };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      // Fallback to mock embedding
      const hash = this.simpleHash(text);
      const embedding = new Array(1536).fill(0).map((_, i) => 
        Math.sin(hash + i) * 0.1
      );
      return embedding;
    }
  }

  async generateContextualReply(
    originalEmail: {
      subject: string;
      body: string;
      senderName: string;
      senderEmail: string;
    },
    conversationHistory: Array<{
      subject: string;
      body: string;
      senderName: string;
      senderEmail: string;
      sentAt: Date;
    }>,
    recentHistory: Array<{
      subject: string;
      body: string;
      senderName: string;
      sentAt: Date;
    }>,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional'
  ): Promise<string> {
    // Build conversation context
    let contextPrompt = '';
    
    if (conversationHistory.length > 0) {
      contextPrompt += 'CONVERSATION THREAD:\n';
      conversationHistory.forEach((email, index) => {
        contextPrompt += `[${index + 1}] ${email.sentAt.toLocaleDateString()} - ${email.senderName}:\n`;
        contextPrompt += `Subject: ${email.subject}\n`;
        contextPrompt += `${email.body.substring(0, 400)}${email.body.length > 400 ? '...' : ''}\n\n`;
      });
    }
    
    if (recentHistory.length > 0) {
      contextPrompt += 'RECENT EMAILS FROM SENDER:\n';
      recentHistory.forEach((email, index) => {
        contextPrompt += `[${index + 1}] ${email.sentAt.toLocaleDateString()}:\n`;
        contextPrompt += `Subject: ${email.subject}\n`;
        contextPrompt += `${email.body.substring(0, 250)}${email.body.length > 250 ? '...' : ''}\n\n`;
      });
    }
    
    const systemInstruction = `You are an expert email assistant writing a contextual reply. Use the conversation history to write an intelligent, appropriate response.

${contextPrompt}

CURRENT EMAIL TO REPLY TO:
From: ${originalEmail.senderName} (${originalEmail.senderEmail})
Subject: ${originalEmail.subject}
Message: ${originalEmail.body}

Instructions:
- Write a ${tone} reply that demonstrates understanding of the full context
- Reference relevant points from previous conversations when appropriate
- Address all questions, requests, and action items in the current email
- Maintain consistency with the established communication style and relationship
- Be concise but thorough in your response
- Include appropriate greeting and closing
- Show continuity with previous discussions when relevant
- Return only the email body content (no subject line)
- Make the response feel natural and contextually aware`;

    const prompt = 'Please generate an intelligent, context-aware reply to this email that takes into account our full conversation history and relationship.';
    
    return this.generateText(prompt, systemInstruction);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

export const openaiService = new OpenAIService();