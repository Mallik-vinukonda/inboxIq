import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '~/env';

export class GeminiService {
  // Multiple API keys for higher quota
  private getAPIKeys(): string[] {
    const keys = [];
    if (env.GOOGLE_GENERATIVE_AI_API_KEY && env.GOOGLE_GENERATIVE_AI_API_KEY !== 'your-api-key-here') {
      keys.push(env.GOOGLE_GENERATIVE_AI_API_KEY);
    }
    if (env.GOOGLE_GENERATIVE_AI_API_KEY_2) {
      keys.push(env.GOOGLE_GENERATIVE_AI_API_KEY_2);
    }
    if (env.GOOGLE_GENERATIVE_AI_API_KEY_3) {
      keys.push(env.GOOGLE_GENERATIVE_AI_API_KEY_3);
    }
    return keys;
  }

  // Try multiple API keys until one works
  private async tryWithMultipleKeys<T>(
    operation: (genAI: GoogleGenerativeAI) => Promise<T>
  ): Promise<T> {
    const apiKeys = this.getAPIKeys();
    
    if (apiKeys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }

    let lastError: Error | null = null;

    for (let i = 0; i < apiKeys.length; i++) {
      try {
        const apiKey = apiKeys[i];
        if (!apiKey) {
          console.log(`⚠️  Skipping empty API key ${i + 1}`);
          continue;
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        console.log(`🔑 Trying Gemini API key ${i + 1}/${apiKeys.length}...`);
        
        const result = await operation(genAI);
        console.log(`✅ Success with API key ${i + 1}`);
        return result;
        
      } catch (error: any) {
        console.log(`❌ API key ${i + 1} failed:`, error.message.substring(0, 100));
        lastError = error;
        
        // If it's not a quota error, don't try other keys
        if (!error.message.includes('429') && 
            !error.message.includes('quota') && 
            !error.message.includes('QUOTA_EXCEEDED')) {
          console.log('🚫 Non-quota error, not trying other keys');
          throw error;
        }
        
        // Continue to next key for quota errors
        console.log(`⏭️ Quota exceeded on key ${i + 1}, trying next key...`);
      }
    }

    // All keys failed
    console.log('❌ All Gemini API keys exhausted');
    throw lastError || new Error('All Gemini API keys failed');
  }
  
  // Try multiple model names for compatibility
  private async getWorkingModel(genAI: GoogleGenerativeAI) {
    const modelNames = [
      'gemini-2.5-flash',      // ✅ CONFIRMED WORKING
      'gemini-2.5-pro',        // Has quota limits
      'gemini-2.0-flash',      // Has quota limits  
      'gemini-1.5-flash',      // Not accessible
      'gemini-1.5-pro',        // Not accessible
      'gemini-pro'             // Not accessible
    ];
    
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: modelName.includes('pro') ? 8192 : 2048,
          }
        });
        
        // Test the model with a simple request
        await model.generateContent("test");
        console.log(`✅ Using Gemini model: ${modelName}`);
        return model;
      } catch (error: unknown) {
        console.log(`⚠️ Model ${modelName} not available:`, (error as Error).message);
        continue;
      }
    }
    
    // If all else fails, return the default working model
    console.log('🎯 Using confirmed working model: gemini-2.5-flash');
    return genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use multi-key fallback system
        const result = await this.tryWithMultipleKeys(async (genAI) => {
          // Get a working model
          const model = await this.getWorkingModel(genAI);
          
          // Use system instruction properly
          let content = prompt;
          if (systemInstruction) {
            content = `${systemInstruction}\n\nUser Request: ${prompt}`;
          }

          console.log(`Sending request to Gemini API (attempt ${attempt}/${maxRetries})...`);
          const result = await model.generateContent(content);
          const response = result.response;
          const text = response.text();
          
          if (!text || text.trim() === '') {
            throw new Error('Gemini API returned empty response');
          }
          
          return text;
        });
        
        console.log('✅ Gemini API request successful');
        return result;
        
      } catch (error: any) {
        console.error(`Gemini API error (attempt ${attempt}/${maxRetries}):`, error);
        
        // Handle specific Gemini API errors that shouldn't be retried
        if (error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
          throw new Error('Invalid Gemini API key. Please check your GOOGLE_GENERATIVE_AI_API_KEY.');
        }
        if (error?.message?.includes('SAFETY')) {
          throw new Error('Content was blocked by Gemini safety filters.');
        }
        if (error?.message?.includes('BLOCKED')) {
          throw new Error('Request was blocked by Gemini. Try rephrasing your message.');
        }
        if (error?.status === 404) {
          throw new Error('Gemini models not accessible. Please check your API key permissions or use OpenAI instead.');
        }
        
        // Handle retryable errors
        const isRetryable = error?.status === 503 || // Service Unavailable
                           error?.status === 429 || // Too Many Requests
                           error?.status === 500 || // Internal Server Error
                           error?.message?.includes('overloaded') ||
                           error?.message?.includes('QUOTA_EXCEEDED');
        
        if (isRetryable && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms... (${error?.status || 'unknown error'})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Final attempt failed or non-retryable error
        if (error?.status === 503 || error?.message?.includes('overloaded')) {
          throw new Error('Gemini API is currently overloaded. Please try again in a few minutes.');
        }
        if (error?.status === 429 || error?.message?.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API quota exceeded. Please try again later.');
        }
        
        // Generic error handling
        const errorMessage = error?.message || 'Unknown error occurred';
        throw new Error(`Gemini API error: ${errorMessage}`);
      }
    }
    
    throw new Error('Failed to get response from Gemini after multiple attempts');
  }

  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Promise<string> {
    try {
      console.log('🤖 Generating chat response with Gemini (multi-key)...');
      
      // Validate input
      if (!messages || messages.length === 0) {
        throw new Error('No messages provided for chat response');
      }

      // Convert messages to a single prompt for Gemini
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = systemMessage 
        ? `${systemMessage}\n\n${conversationHistory}`
        : conversationHistory;

      console.log('📝 Prompt length:', fullPrompt.length, 'characters');

      // Use the multi-key system
      const response = await this.generateText(fullPrompt);
      
      console.log('✅ Chat response generated successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Gemini chat response error:', error);
      
      // Re-throw with more specific error information
      if (error?.message?.includes('API key')) {
        throw new Error('Gemini API key issue: ' + error.message);
      }
      if (error?.message?.includes('quota') || error?.message?.includes('overloaded')) {
        throw new Error('Gemini API temporarily unavailable: ' + error.message);
      }
      if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
        throw new Error('Content blocked by Gemini safety filters. Try rephrasing your message.');
      }
      
      // Generic error with original message
      throw new Error(`Gemini chat error: ${error?.message || 'Unknown error'}`);
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
    // Note: Gemini doesn't have a direct embedding API like OpenAI
    // For now, we'll return a mock embedding or use a different approach
    // In production, you might want to use a different service for embeddings
    console.warn('Gemini embeddings not implemented, using mock embedding');
    
    // Generate a simple hash-based mock embedding
    const hash = this.simpleHash(text);
    const embedding = new Array(1536).fill(0).map((_, i) => 
      Math.sin(hash + i) * 0.1
    );
    
    return embedding;
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
        contextPrompt += `${email.body.substring(0, 300)}${email.body.length > 300 ? '...' : ''}\n\n`;
      });
    }
    
    if (recentHistory.length > 0) {
      contextPrompt += 'RECENT EMAILS FROM SENDER:\n';
      recentHistory.forEach((email, index) => {
        contextPrompt += `[${index + 1}] ${email.sentAt.toLocaleDateString()}:\n`;
        contextPrompt += `Subject: ${email.subject}\n`;
        contextPrompt += `${email.body.substring(0, 200)}${email.body.length > 200 ? '...' : ''}\n\n`;
      });
    }
    
    const systemInstruction = `You are an expert email assistant writing a contextual reply. Use the conversation history to write an intelligent, appropriate response.

${contextPrompt}

CURRENT EMAIL TO REPLY TO:
From: ${originalEmail.senderName} (${originalEmail.senderEmail})
Subject: ${originalEmail.subject}
Message: ${originalEmail.body}

Instructions:
- Write a ${tone} reply that shows you understand the context
- Reference relevant points from previous conversations when appropriate
- Address all questions and requests in the current email
- Maintain consistency with the established relationship tone
- Be concise but thorough
- Include appropriate greeting and closing
- Return only the email body content (no subject line)`;

    const prompt = 'Please generate an intelligent, context-aware reply to this email based on our conversation history.';
    
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

export const geminiService = new GeminiService();